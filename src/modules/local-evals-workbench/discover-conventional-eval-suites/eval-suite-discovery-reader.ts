import { constants, promises as fs } from 'node:fs';
import path from 'node:path';

import type { DeclaredInputInspectionResult, EvalSuiteDiscoveryReaderPort, RawEvalSuiteDefinition } from './ports.js';
import type { EvalSuiteDiscoveryDiagnostic } from './result.js';
import { declaredRunnerFile, type NormalizedEvalSuite, type TextContent } from './suite-contract.js';

const EVALS_FOLDER = 'evals';
const MAX_INSPECTED_CONTENT_BYTES = 1_000_000;
const MAX_SUITE_DEFINITION_BYTES = 1_000_000;

type DeclaredPath = {
  readonly location: string;
  readonly relativePath: string;
  readonly root: 'project' | 'evals';
  readonly inspectContent: boolean;
};

type PathAccess = (candidate: string) => Promise<void>;

export class NodeEvalSuiteDiscoveryReader implements EvalSuiteDiscoveryReaderPort {
  constructor(private readonly accessPath: PathAccess = (candidate) => fs.access(candidate)) {}

  async readConventionalEvalSuites(projectRoot: string): Promise<readonly RawEvalSuiteDefinition[]> {
    const safeRoot = await realProjectRoot(projectRoot);
    const evalsPath = path.join(safeRoot, EVALS_FOLDER);

    const evalsPresence = await pathPresence(evalsPath, this.accessPath);
    if (evalsPresence === 'missing') return [emptyDefinition('evals-folder-missing', 'info', 'evals-folder-missing', 'Project does not contain a root evals/ folder.')];
    if (evalsPresence === 'unreadable') return [emptyDefinition('evals-folder-unreadable', 'error', 'evals-folder-unreadable', 'The evals/ folder could not be checked.')];
    if (!(await isContainedExistingPath(safeRoot, evalsPath))) return [emptyDefinition('declared-path-unsafe', 'error', 'evals-folder-unsafe', 'The evals/ folder must stay inside the project root.')];

    let entries;
    try {
      entries = await fs.readdir(evalsPath, { withFileTypes: true });
    } catch {
      return [emptyDefinition('suite-file-read-failed', 'error', 'evals-folder-unreadable', 'The evals/ folder could not be read.')];
    }

    const definitions: RawEvalSuiteDefinition[] = [];
    for (const entry of entries) {
      if ((entry.isFile() || entry.isSymbolicLink()) && path.extname(entry.name) === '.json') definitions.push(await readSuiteFile(safeRoot, entry.name));
    }
    return definitions.length > 0 ? definitions : [emptyDefinition('suite-definition-malformed', 'warning', 'no-suite-definitions', 'No JSON eval suite definitions were found in evals/.')];
  }

  async inspectDeclaredInputs(projectRoot: string, _source: string, suite: NormalizedEvalSuite): Promise<DeclaredInputInspectionResult> {
    const safeRoot = await realProjectRoot(projectRoot);
    const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
    for (const declaredPath of declaredPaths(suite)) diagnostics.push(...await inspectDeclaredPath(safeRoot, declaredPath));
    return diagnostics.length === 0 ? { status: 'safe' } : { status: 'blocked', diagnostics };
  }
}

async function readSuiteFile(projectRoot: string, fileName: string): Promise<RawEvalSuiteDefinition> {
  const source = `${EVALS_FOLDER}/${fileName}`;
  const filePath = path.join(projectRoot, EVALS_FOLDER, fileName);
  if (!(await isContainedExistingPath(projectRoot, filePath))) return { source, payload: undefined, diagnostics: [diagnostic('declared-path-unsafe', 'error', source, 'suite-file-unsafe', 'Eval suite path must stay inside the project root.')] };
  try {
    const contents = await readBoundedFile(filePath, MAX_SUITE_DEFINITION_BYTES);
    if (contents === undefined) return { source, payload: undefined, diagnostics: [diagnostic('suite-definition-malformed', 'error', source, 'suite-definition-too-large', 'Eval suite definition exceeds the safe byte limit.')] };
    const payload = JSON.parse(contents) as unknown;
    return { source, payload, diagnostics: [] };
  } catch {
    return { source, payload: undefined, diagnostics: [diagnostic('suite-file-read-failed', 'error', source, 'suite-json-unreadable', 'Eval suite JSON could not be read or parsed.')] };
  }
}

function declaredPaths(suite: NormalizedEvalSuite): readonly DeclaredPath[] {
  const paths: DeclaredPath[] = [{ location: 'target.path', relativePath: suite.target.path, root: 'project', inspectContent: false }];
  const runnerFile = declaredRunnerFile(suite.runner.command);
  if (runnerFile) paths.push({ location: `runner.command[${runnerFile.index}]`, relativePath: runnerFile.path, root: 'project', inspectContent: false });
  suite.testCases.forEach((testCase, caseIndex) => {
    addTextPath(paths, testCase.reference, `testCases[${caseIndex}].reference`);
    if (testCase.fixture?.type === 'file') paths.push({ location: `testCases[${caseIndex}].fixture`, relativePath: testCase.fixture.path, root: 'evals', inspectContent: true });
    testCase.turns.forEach((turn, turnIndex) => addTextPath(paths, turn.content, `testCases[${caseIndex}].turns[${turnIndex}].content`));
    testCase.assertions.forEach((assertion, assertionIndex) => {
      if (assertion.type === 'output-equals') addTextPath(paths, assertion.expected, `testCases[${caseIndex}].assertions[${assertionIndex}].expected`);
    });
    testCase.graders.forEach((grader, graderIndex) => {
      if (grader.type === 'rubric') addTextPath(paths, grader.rubric, `testCases[${caseIndex}].graders[${graderIndex}].rubric`);
    });
  });
  return paths;
}

function addTextPath(paths: DeclaredPath[], content: TextContent | undefined, location: string): void {
  if (content?.type === 'file') paths.push({ location, relativePath: content.path, root: 'evals', inspectContent: true });
}

async function inspectDeclaredPath(projectRoot: string, declared: DeclaredPath): Promise<readonly EvalSuiteDiscoveryDiagnostic[]> {
  const allowedRoot = declared.root === 'evals' ? path.join(projectRoot, EVALS_FOLDER) : projectRoot;
  const candidate = path.resolve(allowedRoot, declared.relativePath);
  if (!isPathInside(allowedRoot, candidate)) return [pathDiagnostic(declared, 'declared-path-unsafe', 'declared-path-escape', 'Declared path must stay inside its allowed root.')];

  const containment = await resolveNearestExisting(candidate);
  if (!containment || !isPathInside(await fs.realpath(allowedRoot), containment.realPath)) return [pathDiagnostic(declared, 'declared-path-unsafe', 'declared-path-symlink-escape', 'Declared path must not cross a symlink outside its allowed root.')];
  if (!containment.exists) return [pathDiagnostic(declared, 'declared-file-missing', 'declared-file-missing', 'Declared file was not found.')];

  try {
    const stats = await fs.stat(candidate);
    if (!stats.isFile()) return [pathDiagnostic(declared, 'declared-file-unreadable', 'declared-file-not-regular', 'Declared path must identify a regular file.')];
    await fs.access(candidate, constants.R_OK);
    if (!declared.inspectContent) return [];
    if (stats.size > MAX_INSPECTED_CONTENT_BYTES) return [pathDiagnostic(declared, 'sensitive-content-detected', 'declared-content-too-large', 'Declared content exceeds the safe inspection limit.')];
    const content = await fs.readFile(candidate, 'utf8');
    return containsSensitiveContent(content) ? [pathDiagnostic(declared, 'sensitive-content-detected', 'sensitive-file-content', 'Declared content contains sensitive material.')] : [];
  } catch {
    return [pathDiagnostic(declared, 'declared-file-unreadable', 'declared-file-unreadable', 'Declared file could not be safely read.')];
  }
}

async function resolveNearestExisting(candidate: string): Promise<{ readonly exists: boolean; readonly realPath: string } | undefined> {
  let current = candidate;
  let exists = true;
  while (true) {
    try {
      return { exists, realPath: await fs.realpath(current) };
    } catch {
      exists = false;
      const parent = path.dirname(current);
      if (parent === current) return undefined;
      current = parent;
    }
  }
}

async function isContainedExistingPath(root: string, candidate: string): Promise<boolean> {
  try {
    return isPathInside(await fs.realpath(root), await fs.realpath(candidate));
  } catch {
    return false;
  }
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function containsSensitiveContent(value: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
    || /\b[A-Z0-9_]*(?:api[_-]?key|token|secret|password|credential)\s*[:=]\s*(?!<|\$\{|redacted|test|fake|example)[^\s,;}]{8,}/i.test(value)
    || /\bBearer\s+[A-Za-z0-9._~+/-]{12,}/i.test(value)
    || /\braw[-_ ]production[-_ ]data\b/i.test(value);
}

function pathDiagnostic(declared: DeclaredPath, code: EvalSuiteDiscoveryDiagnostic['code'], reason: string, message: string): EvalSuiteDiscoveryDiagnostic {
  return diagnostic(code, 'error', declared.location, reason, message);
}

function emptyDefinition(code: EvalSuiteDiscoveryDiagnostic['code'], severity: EvalSuiteDiscoveryDiagnostic['severity'], reason: string, message: string): RawEvalSuiteDefinition {
  return { source: EVALS_FOLDER, payload: undefined, diagnostics: [diagnostic(code, severity, EVALS_FOLDER, reason, message)] };
}

function diagnostic(code: EvalSuiteDiscoveryDiagnostic['code'], severity: EvalSuiteDiscoveryDiagnostic['severity'], location: string, reason: string, message: string): EvalSuiteDiscoveryDiagnostic {
  return { code, severity, location, reason, message };
}

async function realProjectRoot(projectRoot: string): Promise<string> { return fs.realpath(projectRoot); }
async function pathPresence(candidate: string, accessPath: PathAccess): Promise<'present' | 'missing' | 'unreadable'> {
  try {
    await accessPath(candidate);
    return 'present';
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable';
  }
}

async function readBoundedFile(filePath: string, maxBytes: number): Promise<string | undefined> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(maxBytes + 1);
    let bytesRead = 0;
    while (bytesRead <= maxBytes) {
      const result = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (result.bytesRead === 0) return buffer.subarray(0, bytesRead).toString('utf8');
      bytesRead += result.bytesRead;
    }
    return undefined;
  } finally {
    await handle.close();
  }
}
