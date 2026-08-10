import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { EvalSuiteDiscoveryReaderPort, RawEvalSuiteDefinition } from './ports.js';
import type { EvalSuiteDiscoveryDiagnostic } from './result.js';

const EVALS_FOLDER = 'evals';
const SUITE_FILE_EXTENSIONS = new Set(['.json']);
const REFERENCE_FIELDS = ['fixture', 'fixturePath', 'expected', 'expectedPath', 'reference', 'referencePath'];

export class NodeEvalSuiteDiscoveryReader implements EvalSuiteDiscoveryReaderPort {
  async readConventionalEvalSuites(projectRoot: string): Promise<readonly RawEvalSuiteDefinition[]> {
    const safeRoot = await realProjectRoot(projectRoot);
    const evalsPath = path.join(safeRoot, EVALS_FOLDER);
    const evalsLocation = EVALS_FOLDER;

    if (!(await pathExists(evalsPath))) {
      return [{ source: evalsLocation, payload: undefined, diagnostics: [diagnostic('evals-folder-missing', 'info', evalsLocation, 'Project does not contain a root evals/ folder.')] }];
    }

    if (!(await isContainedPath(safeRoot, evalsPath))) {
      return [{ source: evalsLocation, payload: undefined, diagnostics: [diagnostic('fixture-reference-unsafe', 'error', evalsLocation, 'The evals/ folder must stay inside the project root.')] }];
    }

    const entries = await fs.readdir(evalsPath, { withFileTypes: true });
    const definitions: RawEvalSuiteDefinition[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !SUITE_FILE_EXTENSIONS.has(path.extname(entry.name))) {
        continue;
      }
      definitions.push(await readSuiteFile(safeRoot, path.join(evalsPath, entry.name)));
    }

    if (definitions.length === 0) {
      return [{ source: evalsLocation, payload: undefined, diagnostics: [diagnostic('suite-definition-malformed', 'warning', evalsLocation, 'No JSON eval suite definitions were found in evals/.')] }];
    }

    return definitions;
  }
}

async function readSuiteFile(projectRoot: string, filePath: string): Promise<RawEvalSuiteDefinition> {
  const source = safeLocation(projectRoot, filePath);

  if (!(await isContainedPath(projectRoot, filePath))) {
    return { source, payload: undefined, diagnostics: [diagnostic('fixture-reference-unsafe', 'error', source, 'Eval suite path must stay inside the project root.')] };
  }

  try {
    const payload = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
    return { source, payload, diagnostics: await validateReferencePaths(projectRoot, source, payload) };
  } catch {
    return { source, payload: undefined, diagnostics: [diagnostic('suite-file-read-failed', 'error', source, 'Eval suite JSON could not be read or parsed.')] };
  }
}

async function validateReferencePaths(projectRoot: string, source: string, payload: unknown): Promise<readonly EvalSuiteDiscoveryDiagnostic[]> {
  const references = collectStringReferences(payload);
  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];

  for (const reference of references) {
    if (path.isAbsolute(reference) || reference.includes('\0')) {
      diagnostics.push(diagnostic('fixture-reference-unsafe', 'error', source, 'Fixture/reference path must be relative to evals/ and inside the project root.'));
      continue;
    }

    const candidatePath = path.join(projectRoot, EVALS_FOLDER, reference);
    if (!(await isContainedPath(projectRoot, candidatePath))) {
      diagnostics.push(diagnostic('fixture-reference-unsafe', 'error', source, 'Fixture/reference path must stay inside the project root.'));
      continue;
    }

    if (!(await pathExists(candidatePath))) {
      diagnostics.push(diagnostic('fixture-read-failed', 'error', source, 'Referenced fixture or expected context file was not found.'));
    }
  }

  return diagnostics;
}

function collectStringReferences(value: unknown): readonly string[] {
  const references: string[] = [];
  visitForReferences(value, references);
  return references;
}

function visitForReferences(value: unknown, references: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      visitForReferences(item, references);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, fieldValue] of Object.entries(value)) {
    if (REFERENCE_FIELDS.includes(key) && typeof fieldValue === 'string') {
      references.push(fieldValue);
    }
    visitForReferences(fieldValue, references);
  }
}

async function realProjectRoot(projectRoot: string): Promise<string> {
  return fs.realpath(projectRoot);
}

async function isContainedPath(projectRoot: string, candidatePath: string): Promise<boolean> {
  const root = await fs.realpath(projectRoot);
  const candidate = await realpathIfExists(candidatePath);
  if (!candidate) {
    const normalizedCandidate = path.resolve(candidatePath);
    return isPathInside(root, normalizedCandidate);
  }

  return isPathInside(root, candidate);
}

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function realpathIfExists(candidatePath: string): Promise<string | undefined> {
  try {
    return await fs.realpath(candidatePath);
  } catch {
    return undefined;
  }
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

function safeLocation(projectRoot: string, candidatePath: string): string {
  const relative = path.relative(projectRoot, candidatePath);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    return EVALS_FOLDER;
  }

  return relative.split(path.sep).join('/');
}

function diagnostic(code: EvalSuiteDiscoveryDiagnostic['code'], severity: EvalSuiteDiscoveryDiagnostic['severity'], location: string, message: string): EvalSuiteDiscoveryDiagnostic {
  return { code, severity, location, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
