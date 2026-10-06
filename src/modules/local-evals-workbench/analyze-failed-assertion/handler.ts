import type { AnalyzeFailedAssertionCommand } from './command.js';
import { FailureAnalysisProviderError } from './ports.js';
import type { AnalyzeFailedAssertionLogEvent, AnalyzeFailedAssertionLoggerPort, AssistanceConfigPort, FailedAssertionRunArtifactReaderPort, FailureAnalysisLlmPort, FailureAnalysisStorePort } from './ports.js';
import type { AnalyzeFailedAssertionBlockedResult, AnalyzeFailedAssertionErrorResult, AnalyzeFailedAssertionResult } from './result.js';
import { logicalId } from '../run-history/validation.js';
import { supportedModelId } from '../repair-context/model-id.js';
import type { AnalysisContextReaderPort } from './context-reader.js';

export type AnalyzeFailedAssertionDependencies = {
  readonly artifactReader: FailedAssertionRunArtifactReaderPort;
  readonly contextReader?: AnalysisContextReaderPort;
  readonly assistanceConfig: AssistanceConfigPort;
  readonly llm: FailureAnalysisLlmPort;
  readonly analysisStore: FailureAnalysisStorePort;
  readonly logger: AnalyzeFailedAssertionLoggerPort;
  readonly clock?: () => number;
};

export async function analyzeFailedAssertion(command: AnalyzeFailedAssertionCommand, dependencies: AnalyzeFailedAssertionDependencies): Promise<AnalyzeFailedAssertionResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const config = dependencies.assistanceConfig.getConfig();
  emit(dependencies.logger, 'info', { event: 'failure_analysis_requested', stage: 'analysis', outcome: 'started' });

  const blockedScope = validateScope(command);
  if (blockedScope) return logBlocked(blockedScope, startedAt, dependencies);

  let selected;
  try {
    selected = await dependencies.artifactReader.read(command);
  } catch {
    return logBlocked(blocked('missing-artifact', 'The selected saved evidence could not be read.'), startedAt, dependencies);
  }
  if (selected.status === 'blocked') return logBlocked(blocked(
    selected.reason === 'non-failed-assertion' ? 'non-failed-assertion' : 'missing-artifact',
    'The selected failed assertion is unavailable in this saved run.'
  ), startedAt, dependencies);
  if (selected.value.evidence.suiteId !== command.suiteId
    || selected.value.evidence.runId !== command.runId
    || selected.value.evidence.attempt !== command.attempt
    || selected.value.evidence.testCaseId !== command.testCaseId
    || selected.value.evidence.assertionId !== command.assertionId) {
    return logBlocked(blocked('missing-assertion', 'The selected assertion no longer matches this saved run.'), startedAt, dependencies);
  }
  if (selected.value.testedModel !== command.evalRunModelId
    || selected.value.evidence.evalRunModelId !== command.evalRunModelId
    || selected.value.runScope !== (command.runScope.type === 'all' ? 'all' : 'selected')) {
    return logBlocked(blocked('invalid-scope', 'The selected model or scope does not match this saved run.'), startedAt, dependencies);
  }
  const evidence = selected.value.evidence;
  if (!config.hasOpenAiApiKey) {
    finish(dependencies, startedAt, { outcome: 'blocked', reason: 'missing-openai-api-key' });
    return {
      status: 'analysis-unavailable',
      reason: 'missing-openai-api-key',
      message: 'Analysis unavailable',
      setupGuidance: ['Set OPENAI_API_KEY in the server environment.', 'Optionally set SIBU_EVALS_MODEL to choose the assistance model.'],
      assistanceModelLabel: config.assistanceModelLabel,
      evidence,
    };
  }

  try {
    const context = await dependencies.contextReader?.read(command).catch(() => ({ origin: 'current-project' as const, excerpts: [], missing: ['Case input', 'Fixture', 'Case reference', 'Selected check', 'Target source', 'Target prompt'] }));
    const analysis = await dependencies.llm.analyzeFailure({ model: config.assistanceModelLabel, evidence, context });
    const analysisId = dependencies.analysisStore.save(command, analysis);
    finish(dependencies, startedAt, { outcome: 'completed', reason: 'analysis-ready' });
    return { status: 'analysis-ready', analysisId, assistanceModelLabel: config.assistanceModelLabel, evidence, analysis,
      ...(context ? { contextSummary: { origin: context.origin, available: context.excerpts.map(item => item.source), missing: context.missing } } : {}) };
  } catch (error) {
    const reason = providerFailureReason(error);
    finish(dependencies, startedAt, { outcome: 'failed', reason });
    return { status: 'error', reason, message: 'Failure analysis could not be completed. Try again later.', assistanceModelLabel: config.assistanceModelLabel, evidence };
  }
}

function validateScope(command: AnalyzeFailedAssertionCommand): AnalyzeFailedAssertionBlockedResult | null {
  if (!Number.isInteger(command.attempt) || command.attempt < 1 || command.attempt > 20
    || ![command.suiteId, command.runId, command.testCaseId, command.assertionId].every(logicalId)
    || !supportedModelId(command.evalRunModelId)) {
    return blocked('invalid-scope', 'Select one saved run and attempt.');
  }
  if (command.runScope.type !== 'all' && (command.runScope.type !== 'test_case' || command.runScope.testCaseId !== command.testCaseId)) {
    return blocked('invalid-scope', 'Analysis must stay scoped to the active failed assertion test case.');
  }
  return null;
}

function blocked(reason: AnalyzeFailedAssertionBlockedResult['reason'], message: string): AnalyzeFailedAssertionBlockedResult {
  return { status: 'blocked', reason, message };
}

function logBlocked(result: AnalyzeFailedAssertionBlockedResult, startedAt: number, dependencies: AnalyzeFailedAssertionDependencies): AnalyzeFailedAssertionBlockedResult {
  finish(dependencies, startedAt, { outcome: 'blocked', reason: result.reason });
  return result;
}

function providerFailureReason(error: unknown): AnalyzeFailedAssertionErrorResult['reason'] {
  if (!(error instanceof FailureAnalysisProviderError)) return 'unknown';
  switch (error.category) {
    case 'authorization': return 'provider-authorization';
    case 'rate-limit': return 'provider-rate-limit';
    case 'timeout': return 'provider-timeout';
    case 'unavailable': return 'provider-unavailable';
    case 'invalid-response': return 'invalid-llm-response';
    case 'unknown': return 'unknown';
  }
}

type TerminalEvent = Extract<AnalyzeFailedAssertionLogEvent, { event: 'failure_analysis_finished' }>;

function finish(dependencies: AnalyzeFailedAssertionDependencies, startedAt: number, outcome: Pick<TerminalEvent, 'outcome' | 'reason'>): void {
  const event: TerminalEvent = { event: 'failure_analysis_finished', stage: 'analysis', ...outcome, durationMs: elapsed(startedAt, dependencies) };
  emit(dependencies.logger, outcome.outcome === 'completed' ? 'info' : outcome.outcome === 'blocked' ? 'warn' : 'error', event);
}

function emit(logger: AnalyzeFailedAssertionLoggerPort, level: 'info' | 'warn' | 'error', event: AnalyzeFailedAssertionLogEvent): void {
  try { logger[level](event); } catch { /* Diagnostics must not change the analysis result. */ }
}

function elapsed(startedAt: number, dependencies: AnalyzeFailedAssertionDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
