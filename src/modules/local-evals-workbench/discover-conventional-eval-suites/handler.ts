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
  dependencies.logger.info({ event: 'eval_suite_discovery_started' });

  const rawDefinitions = await dependencies.discoveryReader.readConventionalEvalSuites(command.projectRoot);
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
  const result = buildResult(suites, definitions, diagnostics);
  const completedEvent = {
    event: 'eval_suite_discovery_completed' as const,
    outcome: result.status,
    suiteCount: suites.length,
    diagnosticCount: diagnostics.length,
    unsupportedCount: diagnostics.filter((diagnostic) => diagnostic.code === 'suite-definition-unsupported').length,
    reasonCodes: [...new Set(diagnostics.map((diagnostic) => diagnostic.reason ?? diagnostic.code))].sort(),
    durationMs: Math.max(0, clock() - startedAt),
  };
  if (result.status === 'ready') dependencies.logger.info(completedEvent);
  else dependencies.logger.warn(completedEvent);
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
  };
}

function buildResult(suites: readonly EvalSuiteSummary[], definitions: readonly NormalizedEvalSuite[], diagnostics: readonly EvalSuiteDiscoveryDiagnostic[]): InternalEvalSuiteDiscoveryResult {
  if (suites.length > 0) return { status: 'ready', suites, definitions, diagnostics };
  const missingEvalsFolder = diagnostics.some((diagnostic) => diagnostic.code === 'evals-folder-missing');
  return {
    status: 'blocked',
    reason: missingEvalsFolder ? 'missing-evals-folder' : 'no-valid-eval-suites',
    message: missingEvalsFolder ? 'No conventional evals folder was found.' : 'No valid version-2 Sibu eval suites were found.',
    guidance: missingEvalsFolder
      ? ['Add version-2 Sibu eval suite JSON files under the project root evals/ folder.']
      : ['Correct the reported definition issues or regenerate the suite using Sibu eval suite version 2.'],
    suites: [],
    definitions: [],
    diagnostics,
  };
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
