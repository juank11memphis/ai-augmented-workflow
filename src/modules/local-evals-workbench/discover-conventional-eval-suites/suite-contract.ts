import type { EvalSuiteDiscoveryDiagnostic } from './result.js';
import type {
  CoverageStatus, DeterministicAssertion, EvalGrader, FixtureContent, JsonValue, NormalizedEvalSuite,
  NormalizedEvalTestCase, SuiteContractResult, TargetKind, TextContent, ToolMock, TurnRole,
} from './suite-contract-types.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ENVIRONMENT_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
const SHELL_TOKENS = new Set(['|', '||', '&', '&&', ';', '>', '>>', '<', '<<', '2>', '2>>']);
const SHELL_LAUNCHERS = new Set(['bash', 'cmd', 'cmd.exe', 'dash', 'fish', 'ksh', 'powershell', 'pwsh', 'sh', 'zsh']);
const EVALUATING_INTERPRETERS = new Map([
  ['bun', new Set(['-e', '--eval', '-p', '--print'])],
  ['deno', new Set(['eval'])],
  ['node', new Set(['-e', '--eval', '-p', '--print'])],
  ['perl', new Set(['-e', '-E'])],
  ['python', new Set(['-c'])],
  ['python3', new Set(['-c'])],
  ['ruby', new Set(['-e'])],
]);
const DIRECT_RUNTIME_RUNNER_INDEX = new Map([
  ['bun', 1], ['node', 1], ['perl', 1], ['python', 1], ['python3', 1], ['ruby', 1], ['ts-node', 1], ['tsx', 1],
]);
const MAX_STRUCTURE_DEPTH = 64;
const MAX_STRUCTURE_NODES = 10_000;
const UNSAFE_JSON_PROPERTY_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

export function validateEvalSuiteContract(input: unknown, source = 'suite'): SuiteContractResult {
  if (!isRecord(input)) return invalid([problem(source, 'suite-not-object', 'Suite definition must be an object.')]);
  if (input.version !== 2) return invalid([unsupportedVersion(source)]);
  const structureProblem = inspectStructure(input, source);
  if (structureProblem) return invalid([structureProblem]);
  if (input.kind !== 'sibu-eval-suite') return invalid([problem(`${source}:kind`, 'kind-invalid', 'Suite kind must be sibu-eval-suite.')]);
  const sensitivePayloadDiagnostics = findSensitivePayload(input, source);
  if (sensitivePayloadDiagnostics.length > 0) return invalid(sensitivePayloadDiagnostics);

  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
  rejectUnknownKeys(input, ['version', 'kind', 'id', 'name', 'description', 'target', 'coverage', 'runner', 'testCases'], source, diagnostics);
  const id = readId(input.id, `${source}:id`, diagnostics);
  const name = readText(input.name, `${source}:name`, diagnostics);
  const description = readText(input.description, `${source}:description`, diagnostics);
  const target = readTarget(input.target, source, diagnostics);
  const coverage = readCoverage(input.coverage, source, diagnostics);
  const runner = readRunner(input.runner, source, diagnostics);
  const testCases = readTestCases(input.testCases, source, diagnostics);
  checkUnique(testCases.map((testCase) => testCase.id), `${source}:testCases`, 'case-id-duplicate', diagnostics);

  if (!id || !name || !description || !target || !coverage || !runner || testCases.length === 0 || diagnostics.length > 0) return invalid(diagnostics);
  return { status: 'valid', suite: { version: 2, kind: 'sibu-eval-suite', id, name, description, target, coverage, runner, testCases } };
}

function readTarget(value: unknown, source: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): NormalizedEvalSuite['target'] | undefined {
  const location = `${source}:target`;
  if (!isRecord(value)) return report(location, 'target-invalid', 'Target must be an object.', diagnostics);
  rejectUnknownKeys(value, ['id', 'kind', 'path'], location, diagnostics);
  const id = readId(value.id, `${location}.id`, diagnostics);
  const kind = isTargetKind(value.kind) ? value.kind : report(`${location}.kind`, 'target-kind-invalid', 'Target kind is unsupported.', diagnostics);
  const targetPath = readRelativePath(value.path, `${location}.path`, diagnostics, false);
  return id && kind && targetPath ? { id, kind, path: targetPath } : undefined;
}

function readCoverage(value: unknown, source: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): NormalizedEvalSuite['coverage'] | undefined {
  const location = `${source}:coverage`;
  if (!isRecord(value)) return report(location, 'coverage-invalid', 'Coverage must be an object.', diagnostics);
  rejectUnknownKeys(value, ['categories', 'gaps'], location, diagnostics);
  const categories: { id: string; status: CoverageStatus; reason?: string }[] = [];
  const gaps: { id: string; reason: string }[] = [];
  if (!Array.isArray(value.categories) || value.categories.length === 0) diagnostics.push(problem(`${location}.categories`, 'coverage-categories-empty', 'Coverage categories must be a non-empty array.'));
  else value.categories.forEach((item, index) => {
    const itemLocation = `${location}.categories[${index}]`;
    if (!isRecord(item)) return diagnostics.push(problem(itemLocation, 'coverage-category-invalid', 'Coverage category must be an object.'));
    rejectUnknownKeys(item, ['id', 'status', 'reason'], itemLocation, diagnostics);
    const id = readId(item.id, `${itemLocation}.id`, diagnostics);
    const status = isCoverageStatus(item.status) ? item.status : report(`${itemLocation}.status`, 'coverage-status-invalid', 'Coverage status is unsupported.', diagnostics);
    const reason = item.reason === undefined ? undefined : readText(item.reason, `${itemLocation}.reason`, diagnostics);
    if (status && status !== 'covered' && !reason) diagnostics.push(problem(`${itemLocation}.reason`, 'coverage-reason-required', 'A reason is required when coverage is not fully covered.'));
    if (id && status && (status === 'covered' || reason)) categories.push({ id, status, ...(reason ? { reason } : {}) });
  });
  if (!Array.isArray(value.gaps)) diagnostics.push(problem(`${location}.gaps`, 'coverage-gaps-invalid', 'Coverage gaps must be an array.'));
  else value.gaps.forEach((item, index) => {
    const itemLocation = `${location}.gaps[${index}]`;
    if (!isRecord(item)) return diagnostics.push(problem(itemLocation, 'coverage-gap-invalid', 'Coverage gap must be an object.'));
    rejectUnknownKeys(item, ['id', 'reason'], itemLocation, diagnostics);
    const id = readId(item.id, `${itemLocation}.id`, diagnostics);
    const reason = readText(item.reason, `${itemLocation}.reason`, diagnostics);
    if (id && reason) gaps.push({ id, reason });
  });
  checkUnique(categories.map((item) => item.id), `${location}.categories`, 'coverage-id-duplicate', diagnostics);
  checkUnique(gaps.map((item) => item.id), `${location}.gaps`, 'gap-id-duplicate', diagnostics);
  return categories.length > 0 ? { categories, gaps } : undefined;
}

function readRunner(value: unknown, source: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): NormalizedEvalSuite['runner'] | undefined {
  const location = `${source}:runner`;
  if (!isRecord(value)) return report(location, 'runner-invalid', 'Runner must be an object.', diagnostics);
  rejectUnknownKeys(value, ['command', 'requiredEnvironment'], location, diagnostics);
  const command: string[] = [];
  if (!Array.isArray(value.command) || value.command.length === 0) diagnostics.push(problem(`${location}.command`, 'runner-command-empty', 'Runner command must be a non-empty argument array.'));
  else value.command.forEach((argument, index) => {
    if (typeof argument !== 'string' || argument.trim() === '' || argument.includes('\0') || SHELL_TOKENS.has(argument.trim()) || /[`\n\r|;&<>]|\$\(/.test(argument)) diagnostics.push(problem(`${location}.command[${index}]`, 'runner-command-unsafe', 'Runner command contains an invalid argument.'));
    else command.push(argument);
  });
  if (command.length > 0 && isCommandStringEvaluation(command)) diagnostics.push(problem(`${location}.command`, 'runner-command-evaluation', 'Runner command must invoke a project runner file directly without shell or command-string evaluation.'));
  const runnerFile = declaredRunnerFile(command);
  if (command.length > 0 && !runnerFile) diagnostics.push(problem(`${location}.command`, 'runner-file-missing', 'Runner command must identify one supported project runner file.'));
  if (runnerFile) readRelativePath(runnerFile.path, `${location}.command[${runnerFile.index}]`, diagnostics, false);
  const requiredEnvironment: string[] = [];
  if (!Array.isArray(value.requiredEnvironment)) diagnostics.push(problem(`${location}.requiredEnvironment`, 'runner-environment-invalid', 'Required environment must be an array of names.'));
  else value.requiredEnvironment.forEach((entry, index) => {
    if (typeof entry !== 'string' || !ENVIRONMENT_NAME_PATTERN.test(entry)) diagnostics.push(problem(`${location}.requiredEnvironment[${index}]`, 'runner-environment-name-invalid', 'Required environment entries must contain names only.'));
    else requiredEnvironment.push(entry);
  });
  checkUnique(requiredEnvironment, `${location}.requiredEnvironment`, 'runner-environment-duplicate', diagnostics);
  return command.length > 0 ? { command, requiredEnvironment } : undefined;
}

function readTestCases(value: unknown, source: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): NormalizedEvalTestCase[] {
  if (!Array.isArray(value) || value.length === 0) {
    diagnostics.push(problem(`${source}:testCases`, 'test-cases-empty', 'At least one test case is required.'));
    return [];
  }
  return value.flatMap((item, index) => {
    const location = `${source}:testCases[${index}]`;
    if (!isRecord(item)) { diagnostics.push(problem(location, 'test-case-invalid', 'Test case must be an object.')); return []; }
    rejectUnknownKeys(item, ['id', 'name', 'turns', 'fixture', 'reference', 'toolMocks', 'assertions', 'graders'], location, diagnostics);
    const id = readId(item.id, `${location}.id`, diagnostics);
    const name = item.name === undefined ? id : readText(item.name, `${location}.name`, diagnostics);
    const turns = readTurns(item.turns, location, diagnostics);
    const fixture = item.fixture === undefined ? undefined : readFixtureContent(item.fixture, `${location}.fixture`, diagnostics);
    const reference = item.reference === undefined ? undefined : readTextContent(item.reference, `${location}.reference`, diagnostics);
    const toolMocks = readToolMocks(item.toolMocks, location, diagnostics);
    const assertions = readAssertions(item.assertions, location, diagnostics);
    const graders = readGraders(item.graders, location, diagnostics);
    checkUnique([...assertions, ...graders].map((entry) => entry.id), `${location}.checks`, 'check-id-duplicate', diagnostics);
    if (assertions.length + graders.length === 0) diagnostics.push(problem(`${location}.checks`, 'checks-empty', 'At least one assertion or grader is required.'));
    return id && name && turns.length > 0 ? [{ id, name, turns, ...(fixture ? { fixture } : {}), ...(reference ? { reference } : {}), toolMocks, assertions, graders }] : [];
  });
}

function readTurns(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): NormalizedEvalTestCase['turns'] {
  if (!Array.isArray(value) || value.length === 0) { diagnostics.push(problem(`${location}.turns`, 'turns-empty', 'At least one turn is required.')); return []; }
  return value.flatMap((turn, index) => {
    const itemLocation = `${location}.turns[${index}]`;
    if (!isRecord(turn)) { diagnostics.push(problem(itemLocation, 'turn-invalid', 'Turn must be an object.')); return []; }
    rejectUnknownKeys(turn, ['role', 'content'], itemLocation, diagnostics);
    const role = isTurnRole(turn.role) ? turn.role : report(`${itemLocation}.role`, 'turn-role-invalid', 'Turn role is unsupported.', diagnostics);
    const content = readTextContent(turn.content, `${itemLocation}.content`, diagnostics);
    return role && content ? [{ role, content }] : [];
  });
}

function readToolMocks(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): ToolMock[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) { diagnostics.push(problem(`${location}.toolMocks`, 'tool-mocks-invalid', 'Tool mocks must be an array.')); return []; }
  const mocks = value.flatMap((mock, index) => readToolMock(mock, `${location}.toolMocks[${index}]`, diagnostics));
  checkUnique(mocks.map((mock) => mock.id), `${location}.toolMocks`, 'mock-id-duplicate', diagnostics);
  return mocks;
}

function readToolMock(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): ToolMock[] {
  if (!isRecord(value)) { diagnostics.push(problem(location, 'tool-mock-invalid', 'Tool mock must be an object.')); return []; }
  rejectUnknownKeys(value, ['id', 'tool', 'input', 'outcome'], location, diagnostics);
  const id = readId(value.id, `${location}.id`, diagnostics);
  const tool = readText(value.tool, `${location}.tool`, diagnostics);
  const input = readJson(value.input, `${location}.input`, diagnostics);
  if (!isRecord(value.outcome) || typeof value.outcome.type !== 'string') { diagnostics.push(problem(`${location}.outcome`, 'mock-outcome-invalid', 'Mock outcome must be a supported object.')); return []; }
  let outcome: ToolMock['outcome'] | undefined;
  if (value.outcome.type === 'result' || value.outcome.type === 'unexpected-response') {
    rejectUnknownKeys(value.outcome, ['type', 'value'], `${location}.outcome`, diagnostics);
    const normalized = readJson(value.outcome.value, `${location}.outcome.value`, diagnostics);
    if (normalized !== undefined) outcome = { type: value.outcome.type, value: normalized };
  } else if (value.outcome.type === 'error') {
    rejectUnknownKeys(value.outcome, ['type', 'code', 'message'], `${location}.outcome`, diagnostics);
    const code = readId(value.outcome.code, `${location}.outcome.code`, diagnostics);
    const message = readText(value.outcome.message, `${location}.outcome.message`, diagnostics);
    if (code && message) outcome = { type: 'error', code, message };
  } else {
    rejectUnknownKeys(value.outcome, ['type'], `${location}.outcome`, diagnostics);
    diagnostics.push(problem(`${location}.outcome.type`, 'mock-outcome-type-invalid', 'Mock outcome type is unsupported.'));
  }
  return id && tool && input !== undefined && outcome ? [{ id, tool, input, outcome }] : [];
}

function readAssertions(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): DeterministicAssertion[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) { diagnostics.push(problem(`${location}.assertions`, 'assertions-invalid', 'Assertions must be an array.')); return []; }
  return value.flatMap((assertion, index) => readAssertion(assertion, `${location}.assertions[${index}]`, diagnostics));
}

function readAssertion(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): DeterministicAssertion[] {
  if (!isRecord(value)) { diagnostics.push(problem(location, 'assertion-invalid', 'Assertion must be an object.')); return []; }
  const id = readId(value.id, `${location}.id`, diagnostics);
  const type = value.type;
  if (!id || typeof type !== 'string') { if (typeof type !== 'string') { rejectUnknownKeys(value, ['id', 'type'], location, diagnostics); diagnostics.push(problem(`${location}.type`, 'assertion-type-invalid', 'Assertion type is unsupported.')); } return []; }
  if (type === 'output-equals') { rejectUnknownKeys(value, ['id', 'type', 'expected'], location, diagnostics); const expected = readTextContent(value.expected, `${location}.expected`, diagnostics); return expected ? [{ id, type, expected }] : []; }
  if (type === 'output-contains') { rejectUnknownKeys(value, ['id', 'type', 'expected'], location, diagnostics); const expected = readText(value.expected, `${location}.expected`, diagnostics); return expected ? [{ id, type, expected }] : []; }
  if (type === 'json-schema') { rejectUnknownKeys(value, ['id', 'type', 'schema'], location, diagnostics); const schema = readJson(value.schema, `${location}.schema`, diagnostics); return schema !== undefined ? [{ id, type, schema }] : []; }
  if (type === 'tool-called' || type === 'tool-not-called') { rejectUnknownKeys(value, ['id', 'type', 'tool'], location, diagnostics); const tool = readText(value.tool, `${location}.tool`, diagnostics); return tool ? [{ id, type, tool }] : []; }
  if (type === 'tool-arguments-equal') { rejectUnknownKeys(value, ['id', 'type', 'tool', 'expected'], location, diagnostics); const tool = readText(value.tool, `${location}.tool`, diagnostics); const expected = readJson(value.expected, `${location}.expected`, diagnostics); return tool && expected !== undefined ? [{ id, type, tool, expected }] : []; }
  if (type === 'tool-arguments-schema') { rejectUnknownKeys(value, ['id', 'type', 'tool', 'schema'], location, diagnostics); const tool = readText(value.tool, `${location}.tool`, diagnostics); const schema = readJson(value.schema, `${location}.schema`, diagnostics); return tool && schema !== undefined ? [{ id, type, tool, schema }] : []; }
  if (type === 'tool-call-sequence') { rejectUnknownKeys(value, ['id', 'type', 'tools'], location, diagnostics); const tools = readStringArray(value.tools, `${location}.tools`, diagnostics); return tools.length > 0 ? [{ id, type, tools }] : []; }
  if (type === 'turn-count') { rejectUnknownKeys(value, ['id', 'type', 'expected'], location, diagnostics); const expected = readNonnegativeInteger(value.expected, `${location}.expected`, diagnostics); return expected !== undefined ? [{ id, type, expected }] : []; }
  if (type === 'turn-output') {
    rejectUnknownKeys(value, ['id', 'type', 'turnIndex', 'operator', 'expected'], location, diagnostics);
    const turnIndex = readNonnegativeInteger(value.turnIndex, `${location}.turnIndex`, diagnostics);
    const operator = value.operator === 'equals' || value.operator === 'contains' ? value.operator : report(`${location}.operator`, 'turn-output-operator-invalid', 'Turn output operator is unsupported.', diagnostics);
    const expected = readText(value.expected, `${location}.expected`, diagnostics);
    return turnIndex !== undefined && operator && expected ? [{ id, type, turnIndex, operator, expected }] : [];
  }
  rejectUnknownKeys(value, ['id', 'type'], location, diagnostics);
  diagnostics.push(problem(`${location}.type`, 'assertion-type-invalid', 'Assertion type is unsupported.'));
  return [];
}

function readGraders(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): EvalGrader[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) { diagnostics.push(problem(`${location}.graders`, 'graders-invalid', 'Graders must be an array.')); return []; }
  return value.flatMap<EvalGrader>((grader, index) => {
    const itemLocation = `${location}.graders[${index}]`;
    if (!isRecord(grader)) { diagnostics.push(problem(itemLocation, 'grader-invalid', 'Grader must be an object.')); return []; }
    const id = readId(grader.id, `${itemLocation}.id`, diagnostics);
    if (grader.type === 'custom') { rejectUnknownKeys(grader, ['id', 'type', 'name'], itemLocation, diagnostics); const name = readText(grader.name, `${itemLocation}.name`, diagnostics); return id && name ? [{ id, type: 'custom' as const, name }] : []; }
    if (grader.type === 'rubric') {
      rejectUnknownKeys(grader, ['id', 'type', 'rubric', 'threshold'], itemLocation, diagnostics);
      const rubric = readTextContent(grader.rubric, `${itemLocation}.rubric`, diagnostics);
      const threshold = typeof grader.threshold === 'number' && Number.isFinite(grader.threshold) && grader.threshold >= 0 && grader.threshold <= 1 ? grader.threshold : report(`${itemLocation}.threshold`, 'rubric-threshold-invalid', 'Rubric threshold must be between zero and one.', diagnostics);
      return id && rubric && threshold !== undefined ? [{ id, type: 'rubric' as const, rubric, threshold }] : [];
    }
    rejectUnknownKeys(grader, ['id', 'type'], itemLocation, diagnostics);
    diagnostics.push(problem(`${itemLocation}.type`, 'grader-type-invalid', 'Grader type is unsupported.'));
    return [];
  });
}

function readTextContent(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): TextContent | undefined {
  if (typeof value === 'string') return safeInlineText(value, location, diagnostics);
  if (!isRecord(value)) return report(location, 'text-content-invalid', 'Content must be inline text or a file reference.', diagnostics);
  if (value.type === 'inline') { rejectUnknownKeys(value, ['type', 'text'], location, diagnostics); const text = readText(value.text, `${location}.text`, diagnostics); return text && !containsSensitiveText(text) ? { type: 'inline', text } : sensitiveInline(text, location, diagnostics); }
  if (value.type === 'file') { rejectUnknownKeys(value, ['type', 'path'], location, diagnostics); const filePath = readRelativePath(value.path, `${location}.path`, diagnostics, true); return filePath ? { type: 'file', path: filePath } : undefined; }
  rejectUnknownKeys(value, ['type'], location, diagnostics);
  return report(location, 'text-content-type-invalid', 'Content type is unsupported.', diagnostics);
}

function readFixtureContent(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): FixtureContent | undefined {
  if (!isRecord(value)) return report(location, 'fixture-content-invalid', 'Fixture must be inline JSON or a file reference.', diagnostics);
  if (value.type === 'file') { rejectUnknownKeys(value, ['type', 'path'], location, diagnostics); const filePath = readRelativePath(value.path, `${location}.path`, diagnostics, true); return filePath ? { type: 'file', path: filePath } : undefined; }
  if (value.type === 'inline') { rejectUnknownKeys(value, ['type', 'value'], location, diagnostics); const normalized = readJson(value.value, `${location}.value`, diagnostics); return normalized !== undefined ? { type: 'inline', value: normalized } : undefined; }
  rejectUnknownKeys(value, ['type'], location, diagnostics);
  return report(location, 'fixture-content-type-invalid', 'Fixture type is unsupported.', diagnostics);
}

function readJson(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): JsonValue | undefined {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    if (typeof value === 'string' && containsSensitiveText(value)) return report(location, 'sensitive-inline-content', 'Inline content contains sensitive material.', diagnostics, 'sensitive-content-detected');
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    const normalized: JsonValue[] = [];
    value.forEach((item, index) => { const child = readJson(item, `${location}[${index}]`, diagnostics); if (child !== undefined) normalized.push(child); });
    return normalized.length === value.length ? normalized : undefined;
  }
  if (isRecord(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return report(location, 'json-object-prototype-unsafe', 'JSON objects must use a safe prototype.', diagnostics);
    }
    const normalized: Record<string, JsonValue> = {};
    let valid = true;
    for (const [key, childValue] of Object.entries(value)) {
      if (UNSAFE_JSON_PROPERTY_NAMES.has(key)) {
        diagnostics.push(problem(`${location}.${safeKey(key)}`, 'json-property-name-unsafe', 'JSON property name is not allowed.'));
        valid = false;
        continue;
      }
      if (isSensitiveKey(key) && typeof childValue === 'string' && !isPlaceholder(childValue)) { diagnostics.push(problem(`${location}.${safeKey(key)}`, 'sensitive-inline-field', 'Inline content contains sensitive material.', 'sensitive-content-detected')); valid = false; continue; }
      const child = readJson(childValue, `${location}.${safeKey(key)}`, diagnostics);
      if (child === undefined) valid = false; else normalized[key] = child;
    }
    return valid ? normalized : undefined;
  }
  diagnostics.push(problem(location, 'json-value-invalid', 'Value must be valid JSON data.'));
  return undefined;
}

function readRelativePath(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[], evalsOnly: boolean): string | undefined {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0') || value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) return report(location, 'path-invalid', 'Path must be a safe relative path.', diagnostics, 'declared-path-invalid');
  const normalized = value.replace(/\\/g, '/');
  if (normalized.split('/').some((segment) => segment === '..' || segment === '')) return report(location, 'path-traversal', 'Path must not escape its allowed root.', diagnostics, 'declared-path-unsafe');
  if (evalsOnly && normalized.startsWith('evals/')) return normalized.slice('evals/'.length);
  return normalized;
}

function readId(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): string | undefined {
  if (typeof value === 'string' && ID_PATTERN.test(value)) return value;
  return report(location, 'id-invalid', 'ID must be a non-empty stable identifier.', diagnostics);
}

function readText(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return report(location, 'text-invalid', 'A non-empty string is required.', diagnostics);
}

function readStringArray(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): string[] {
  if (!Array.isArray(value) || value.length === 0) { diagnostics.push(problem(location, 'string-array-empty', 'A non-empty string array is required.')); return []; }
  return value.flatMap((item, index) => { const text = readText(item, `${location}[${index}]`, diagnostics); return text ? [text] : []; });
}

function readNonnegativeInteger(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : report(location, 'integer-invalid', 'A nonnegative integer is required.', diagnostics);
}

function checkUnique(values: readonly string[], location: string, reason: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): void {
  if (new Set(values).size !== values.length) diagnostics.push(problem(location, reason, 'Identifiers must be unique within their scope.'));
}

function rejectUnknownKeys(value: Record<string, unknown>, allowedKeys: readonly string[], location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) diagnostics.push(problem(`${location}.${safeKey(key)}`, 'field-undeclared', 'Field is not declared by the version-2 suite contract.'));
  }
}

function isCommandStringEvaluation(command: readonly string[]): boolean {
  const launcher = pathBasename(command[0] ?? '').toLowerCase();
  if (SHELL_LAUNCHERS.has(launcher)) return true;
  const evaluatingArguments = EVALUATING_INTERPRETERS.get(launcher);
  return evaluatingArguments ? command.slice(1).some((argument) => evaluatingArguments.has(argument)) : false;
}

export function declaredRunnerFile(command: readonly string[]): { readonly index: number; readonly path: string } | undefined {
  const launcher = pathBasename(command[0] ?? '').toLowerCase();
  if (SHELL_LAUNCHERS.has(launcher) || isCommandStringEvaluation(command)) return undefined;
  if (launcher === 'deno') return command[1] === 'run' && isRunnerFile(command[2]) ? { index: 2, path: command[2]! } : undefined;
  const runtimeIndex = DIRECT_RUNTIME_RUNNER_INDEX.get(launcher);
  if (runtimeIndex !== undefined) return isRunnerFile(command[runtimeIndex]) ? { index: runtimeIndex, path: command[runtimeIndex]! } : undefined;
  return isRunnerFile(command[0]) ? { index: 0, path: command[0]! } : undefined;
}

function isRunnerFile(value: string | undefined): value is string {
  if (!value || value.startsWith('-')) return false;
  return value.startsWith('.') || value.includes('/') || value.includes('\\') || /\.(?:c?js|mjs|tsx?|py|rb|pl)$/i.test(value);
}

function pathBasename(value: string): string {
  return value.replace(/\\/g, '/').split('/').at(-1) ?? value;
}

function inspectStructure(value: unknown, location: string): EvalSuiteDiscoveryDiagnostic | undefined {
  const pending: { readonly value: unknown; readonly depth: number }[] = [{ value, depth: 0 }];
  const visited = new WeakSet<object>();
  let nodeCount = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    nodeCount += 1;
    if (nodeCount > MAX_STRUCTURE_NODES) return problem(location, 'suite-structure-too-complex', 'Suite definition exceeds the safe structure limit.');
    if (current.depth > MAX_STRUCTURE_DEPTH) return problem(location, 'suite-structure-too-deep', 'Suite definition exceeds the safe nesting limit.');
    if (typeof current.value !== 'object' || current.value === null) continue;
    if (visited.has(current.value)) return problem(location, 'suite-structure-cyclic', 'Suite definition must be acyclic JSON data.');
    visited.add(current.value);
    const children = Array.isArray(current.value) ? current.value : Object.values(current.value);
    for (const child of children) pending.push({ value: child, depth: current.depth + 1 });
  }
  return undefined;
}

function safeInlineText(text: string, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): TextContent | undefined {
  const normalized = readText(text, location, diagnostics);
  return normalized && !containsSensitiveText(normalized) ? { type: 'inline', text: normalized } : sensitiveInline(normalized, location, diagnostics);
}

function sensitiveInline(text: string | undefined, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): undefined {
  if (text && containsSensitiveText(text)) diagnostics.push(problem(location, 'sensitive-inline-content', 'Inline content contains sensitive material.', 'sensitive-content-detected'));
  return undefined;
}

function containsSensitiveText(value: string): boolean {
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
    || /\b[A-Z0-9_]*(?:api[_-]?key|token|secret|password|credential)\s*[:=]\s*(?!<|\$\{|redacted|test|fake|example)[^\s,;}]{8,}/i.test(value)
    || /\bBearer\s+[A-Za-z0-9._~+/-]{12,}/i.test(value)
    || /\braw[-_ ]production[-_ ]data\b/i.test(value);
}

function findSensitivePayload(value: unknown, location: string): EvalSuiteDiscoveryDiagnostic[] {
  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
  visitPayload(value, location, diagnostics);
  return diagnostics;
}

function visitPayload(value: unknown, location: string, diagnostics: EvalSuiteDiscoveryDiagnostic[]): void {
  if (typeof value === 'string') {
    if (containsSensitiveText(value)) diagnostics.push(problem(location, 'sensitive-inline-content', 'Suite content contains sensitive material.', 'sensitive-content-detected'));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitPayload(item, `${location}[${index}]`, diagnostics));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childLocation = `${location}.${safeKey(key)}`;
    if (isSensitiveKey(key) && typeof child === 'string' && !isPlaceholder(child)) {
      diagnostics.push(problem(childLocation, 'sensitive-inline-field', 'Suite content contains sensitive material.', 'sensitive-content-detected'));
    } else visitPayload(child, childLocation, diagnostics);
  }
}

function isSensitiveKey(key: string): boolean { return /(?:password|passwd|secret|token|api[_-]?key|credential|private[_-]?key)/i.test(key); }
function isPlaceholder(value: string): boolean { return /^(?:<[^>]+>|\$\{[^}]+\}|redacted|test|fake|example|dummy)$/i.test(value.trim()); }
function safeKey(key: string): string { return ID_PATTERN.test(key) ? key : 'field'; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isTargetKind(value: unknown): value is TargetKind { return value === 'agent' || value === 'integration' || value === 'prompt' || value === 'workflow'; }
function isCoverageStatus(value: unknown): value is CoverageStatus { return value === 'covered' || value === 'partly-covered' || value === 'not-applicable' || value === 'known-gap'; }
function isTurnRole(value: unknown): value is TurnRole { return value === 'system' || value === 'user' || value === 'assistant' || value === 'tool'; }

function unsupportedVersion(location: string): EvalSuiteDiscoveryDiagnostic {
  return { code: 'suite-definition-unsupported', reason: 'unsupported-suite-version', severity: 'warning', location, message: 'This suite version is not runnable.', guidance: ['Regenerate this suite using Sibu eval suite version 2.'] };
}

function problem(location: string, reason: string, message: string, code: EvalSuiteDiscoveryDiagnostic['code'] = 'suite-definition-malformed'): EvalSuiteDiscoveryDiagnostic {
  return { code, reason, severity: 'error', location, message };
}

function invalid(diagnostics: readonly EvalSuiteDiscoveryDiagnostic[]): SuiteContractResult { return { status: 'invalid', diagnostics }; }

function report(location: string, reason: string, message: string, diagnostics: EvalSuiteDiscoveryDiagnostic[], code?: EvalSuiteDiscoveryDiagnostic['code']): undefined {
  diagnostics.push(problem(location, reason, message, code));
  return undefined;
}

export type {
  CoverageStatus, DeterministicAssertion, EvalGrader, FixtureContent, JsonValue, NormalizedEvalSuite,
  NormalizedEvalTestCase, SuiteContractResult, TargetKind, TextContent, ToolMock, TurnRole,
} from './suite-contract-types.js';
