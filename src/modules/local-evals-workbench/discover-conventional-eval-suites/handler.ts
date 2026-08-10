import type { DiscoverConventionalEvalSuitesCommand } from './command.js';
import type { EvalSuiteDiscoveryLoggerPort, EvalSuiteDiscoveryReaderPort, RawEvalSuiteDefinition } from './ports.js';
import type { EvalSuiteDiscoveryDiagnostic, EvalSuiteDiscoveryResult, EvalSuiteModelOption, EvalSuiteSummary } from './result.js';

const SUPPORTED_SUITE_VERSION = 1;
const SUPPORTED_ASSERTION_TYPES = new Set(['contains', 'equals', 'llm-rubric']);

export type DiscoverConventionalEvalSuitesDependencies = {
  readonly discoveryReader: EvalSuiteDiscoveryReaderPort;
  readonly logger: EvalSuiteDiscoveryLoggerPort;
  readonly clock?: () => number;
};

export async function discoverConventionalEvalSuites(
  command: DiscoverConventionalEvalSuitesCommand,
  dependencies: DiscoverConventionalEvalSuitesDependencies
): Promise<EvalSuiteDiscoveryResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  dependencies.logger.info({ event: 'eval_suite_discovery_started' });

  const rawDefinitions = await dependencies.discoveryReader.readConventionalEvalSuites(command.projectRoot);
  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
  const suites: EvalSuiteSummary[] = [];

  for (const rawDefinition of rawDefinitions) {
    diagnostics.push(...rawDefinition.diagnostics);
    if (rawDefinition.diagnostics.some((diagnostic) => diagnostic.severity === 'error') || (rawDefinition.payload === undefined && rawDefinition.diagnostics.length > 0)) {
      continue;
    }

    const parsedSuite = toSuiteSummary(rawDefinition);

    if (parsedSuite.summary) {
      suites.push(parsedSuite.summary);
    }
    diagnostics.push(...parsedSuite.diagnostics);
  }

  const result = buildResult(suites, diagnostics);
  const durationMs = Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
  const completedEvent = {
    event: 'eval_suite_discovery_completed' as const,
    outcome: result.status,
    suiteCount: suites.length,
    diagnosticCount: diagnostics.length,
    unsupportedCount: diagnostics.filter((diagnostic) => diagnostic.code === 'suite-definition-unsupported').length,
    durationMs,
  };

  if (result.status === 'ready') {
    dependencies.logger.info(completedEvent);
  } else {
    dependencies.logger.warn(completedEvent);
  }

  return result;
}

function buildResult(suites: readonly EvalSuiteSummary[], diagnostics: readonly EvalSuiteDiscoveryDiagnostic[]): EvalSuiteDiscoveryResult {
  if (suites.length > 0) {
    return { status: 'ready', suites, diagnostics };
  }

  const missingEvalsFolder = diagnostics.some((diagnostic) => diagnostic.code === 'evals-folder-missing');
  return {
    status: 'blocked',
    reason: missingEvalsFolder ? 'missing-evals-folder' : 'no-valid-eval-suites',
    message: missingEvalsFolder ? 'No conventional evals folder was found.' : 'No valid Sibu eval suites were found.',
    guidance: ['Add Sibu eval suite JSON files under the project root evals/ folder.'],
    suites: [],
    diagnostics,
  };
}

function toSuiteSummary(rawDefinition: RawEvalSuiteDefinition): { readonly summary?: EvalSuiteSummary; readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[] } {
  const payload = rawDefinition.payload;
  if (!isRecord(payload)) {
    return { diagnostics: [malformed(rawDefinition.source, 'Suite definition must be an object.')] };
  }

  if (payload.version !== SUPPORTED_SUITE_VERSION) {
    return { diagnostics: [unsupported(rawDefinition.source, 'Only Sibu eval suite version 1 is supported.')] };
  }

  if (payload.kind !== 'sibu-eval-suite') {
    return { diagnostics: [unsupported(rawDefinition.source, 'Only kind "sibu-eval-suite" is supported.')] };
  }

  const id = stringField(payload, 'id');
  const name = stringField(payload, 'name');
  const description = stringField(payload, 'description');
  const modelOptions = modelOptionsFrom(payload.modelOptions);
  const testCases = readyTestCaseCountFrom(payload.testCases);

  const diagnostics = [...id.diagnostics, ...name.diagnostics, ...description.diagnostics, ...modelOptions.diagnostics, ...testCases.diagnostics].map((diagnostic) => ({
    ...diagnostic,
    location: `${rawDefinition.source}:${diagnostic.location}`,
  }));

  if (!id.value || !name.value || !description.value || modelOptions.values.length === 0 || testCases.readyCount === 0 || diagnostics.length > 0) {
    return { diagnostics };
  }

  return {
    summary: {
      id: id.value,
      name: name.value,
      description: description.value,
      readyTestCaseCount: testCases.readyCount,
      modelOptions: modelOptions.values,
    },
    diagnostics,
  };
}

function stringField(record: Record<string, unknown>, field: string): { readonly value?: string; readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[] } {
  const value = record[field];
  if (typeof value === 'string' && value.trim().length > 0) {
    return { value: value.trim(), diagnostics: [] };
  }

  return { diagnostics: [malformed(field, `${field} must be a non-empty string.`)] };
}

function modelOptionsFrom(value: unknown): { readonly values: readonly EvalSuiteModelOption[]; readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[] } {
  if (!Array.isArray(value)) {
    return { values: [], diagnostics: [malformed('modelOptions', 'modelOptions must be an array.')] };
  }

  const values: EvalSuiteModelOption[] = [];
  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
  value.forEach((option, index) => {
    if (!isRecord(option) || typeof option.id !== 'string' || typeof option.label !== 'string' || option.id.trim() === '' || option.label.trim() === '') {
      diagnostics.push(malformed(`modelOptions[${index}]`, 'model option must include non-empty id and label.'));
      return;
    }
    values.push({ id: option.id.trim(), label: option.label.trim() });
  });

  return { values, diagnostics };
}

function readyTestCaseCountFrom(value: unknown): { readonly readyCount: number; readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[] } {
  if (!Array.isArray(value)) {
    return { readyCount: 0, diagnostics: [malformed('testCases', 'testCases must be an array.')] };
  }

  let readyCount = 0;
  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
  value.forEach((testCase, index) => {
    if (!isReadyTestCase(testCase)) {
      diagnostics.push(malformed(`testCases[${index}]`, 'test case must include id, input, and at least one supported assertion.'));
      return;
    }
    readyCount += 1;
  });

  if (readyCount === 0 && diagnostics.length === 0) {
    diagnostics.push(malformed('testCases', 'at least one ready test case is required.'));
  }

  return { readyCount, diagnostics };
}

function isReadyTestCase(value: unknown): boolean {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.trim() === '' || !isRecord(value.input) || !Array.isArray(value.assertions)) {
    return false;
  }

  return value.assertions.some((assertion) => isRecord(assertion) && typeof assertion.type === 'string' && SUPPORTED_ASSERTION_TYPES.has(assertion.type));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function malformed(location: string, message: string): EvalSuiteDiscoveryDiagnostic {
  return { code: 'suite-definition-malformed', severity: 'error', location, message };
}

function unsupported(location: string, message: string): EvalSuiteDiscoveryDiagnostic {
  return { code: 'suite-definition-unsupported', severity: 'warning', location, message };
}
