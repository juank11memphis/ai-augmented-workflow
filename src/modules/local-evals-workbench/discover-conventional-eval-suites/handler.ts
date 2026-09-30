import type { DiscoverConventionalEvalSuitesCommand } from './command.js';
import type { EvalSuiteDiscoveryLoggerPort, EvalSuiteDiscoveryReaderPort } from './ports.js';
import type { EvalSuiteDiscoveryDiagnostic, EvalSuiteSummary, InternalEvalSuiteDiscoveryResult } from './result.js';
import { validateEvalSuiteContract, type NormalizedEvalSuite } from './suite-contract.js';

export type DiscoverConventionalEvalSuitesDependencies = {
  readonly discoveryReader: EvalSuiteDiscoveryReaderPort;
  readonly logger: EvalSuiteDiscoveryLoggerPort;
  readonly clock?: () => number;
};

type ValidatedDefinition = { readonly source: string; readonly suite: NormalizedEvalSuite };

export async function discoverConventionalEvalSuites(
  command: DiscoverConventionalEvalSuitesCommand,
  dependencies: DiscoverConventionalEvalSuitesDependencies
): Promise<InternalEvalSuiteDiscoveryResult> {
  const clock = dependencies.clock ?? Date.now;
  const startedAt = clock();
  emitDiscoveryEvent(() => dependencies.logger.info({ event: 'eval_suite_discovery_started' }));

  let rawDefinitions;
  try {
    rawDefinitions = await dependencies.discoveryReader.readConventionalEvalSuites(command.projectRoot);
  } catch {
    rawDefinitions = [{ source: 'evals', payload: undefined, diagnostics: [{
      code: 'discovery-read-failed' as const,
      reason: 'discovery-read-failed',
      severity: 'error' as const,
      location: 'evals',
      message: 'Eval suite discovery failed before definitions could be read.',
    }] }];
  }
  const diagnostics: EvalSuiteDiscoveryDiagnostic[] = [];
  const validatedDefinitions: ValidatedDefinition[] = [];

  for (const rawDefinition of rawDefinitions) {
    diagnostics.push(...rawDefinition.diagnostics);
    if (rawDefinition.payload === undefined || rawDefinition.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) continue;

    const contract = validateEvalSuiteContract(rawDefinition.payload, safeSourceLocation(rawDefinition.source));
    if (contract.status === 'invalid') {
      diagnostics.push(...contract.diagnostics);
      continue;
    }

    const inputInspection = await dependencies.discoveryReader.inspectDeclaredInputs(command.projectRoot, rawDefinition.source, contract.suite);
    if (inputInspection.status === 'blocked') {
      diagnostics.push(...inputInspection.diagnostics);
      continue;
    }
    validatedDefinitions.push({ source: rawDefinition.source, suite: contract.suite });
  }

  const duplicatedIds = duplicateIds(validatedDefinitions.map((definition) => definition.suite.id));
  duplicatedIds.forEach((id) => diagnostics.push({
    code: 'suite-id-duplicate',
    reason: 'suite-id-duplicate',
    severity: 'error',
    location: 'evals',
    message: `Multiple suite definitions use the safe identifier ${id}; all colliding definitions were excluded.`,
  }));

  const definitions = validatedDefinitions
    .filter((definition) => !duplicatedIds.has(definition.suite.id))
    .map((definition) => definition.suite);
  const suites = definitions.map(toSummary);
  const sourceBySuiteId = Object.fromEntries(validatedDefinitions.filter(item => !duplicatedIds.has(item.suite.id)).map(item => [item.suite.id, item.source]));
  const result = buildResult(suites, definitions, diagnostics, sourceBySuiteId);
  const completedEvent = {
    event: 'eval_suite_discovery_completed' as const,
    outcome: result.status,
    suiteCount: suites.length,
    diagnosticCount: diagnostics.length,
    unsupportedCount: diagnostics.filter((diagnostic) => diagnostic.code === 'suite-definition-unsupported').length,
    reasonCodes: [...new Set(diagnostics.map((diagnostic) => diagnostic.code))].sort(),
    durationMs: Math.max(0, clock() - startedAt),
  };
  emitDiscoveryEvent(() => {
    if (result.status === 'ready') dependencies.logger.info(completedEvent);
    else dependencies.logger.warn(completedEvent);
  });
  return result;
}

function toSummary(suite: NormalizedEvalSuite): EvalSuiteSummary {
  return {
    id: suite.id,
    name: suite.name,
    description: suite.description,
    readyTestCaseCount: suite.testCases.length,
    testCases: suite.testCases.map((testCase) => ({ id: testCase.id, name: testCase.name })),
    modelOptions: [],
    coverage: suite.coverage,
  };
}

function buildResult(suites: readonly EvalSuiteSummary[], definitions: readonly NormalizedEvalSuite[], diagnostics: readonly EvalSuiteDiscoveryDiagnostic[], sourceBySuiteId: Readonly<Record<string, string>>): InternalEvalSuiteDiscoveryResult {
  if (suites.length > 0) return { status: 'ready', suites, definitions, sourceBySuiteId, diagnostics };
  const failed = diagnostics.some((diagnostic) => diagnostic.code === 'discovery-read-failed');
  const missingEvalsFolder = diagnostics.some((diagnostic) => diagnostic.code === 'evals-folder-missing');
  const unreadable = diagnostics.some((diagnostic) => diagnostic.severity === 'error'
    || (diagnostic.code !== 'evals-folder-missing' && diagnostic.reason !== 'no-suite-definitions'));
  const reason = failed ? 'discovery-failed' : missingEvalsFolder ? 'missing-evals-folder' : unreadable ? 'unreadable-eval-suites' : 'no-eval-suites';
  const guidance = reason === 'missing-evals-folder' || reason === 'no-eval-suites'
    ? ['Add version-2 Sibu eval suite JSON files under the project root evals/ folder.']
    : reason === 'unreadable-eval-suites'
      ? ['Review the reported discovery issues, correct file access, or regenerate incompatible suites using Sibu eval suite version 2.']
      : ['Check project access and retry eval suite discovery; the underlying cause is unknown.'];
  return {
    status: 'blocked',
    reason,
    message: reason === 'missing-evals-folder' ? 'No conventional evals folder was found.'
      : reason === 'no-eval-suites' ? 'No eval suites were found in evals/.'
      : reason === 'unreadable-eval-suites' ? 'Eval suites were found but could not be used.'
      : 'Eval suite discovery failed; the underlying cause is unknown.',
    guidance,
    suites: [],
    definitions: [],
    sourceBySuiteId: {},
    diagnostics,
  };
}

function emitDiscoveryEvent(write: () => void): void {
  try { write(); } catch { /* Logging must not change the discovery outcome. */ }
}

function duplicateIds(ids: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  ids.forEach((id) => { if (seen.has(id)) duplicates.add(id); else seen.add(id); });
  return duplicates;
}

function safeSourceLocation(source: string): string {
  return /^evals\/[A-Za-z0-9._-]+\.json$/.test(source) ? source : 'evals/suite.json';
}
