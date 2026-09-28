import type { AnalyzeFailedAssertionCommand } from './command.js';
import type { AnalyzeFailedAssertionLoggerPort, AssistanceConfigPort, FailedAssertionRunArtifactReaderPort, FailureAnalysisLlmPort, FailureAnalysisStorePort } from './ports.js';
import type { AnalyzeFailedAssertionBlockedResult, AnalyzeFailedAssertionResult } from './result.js';
import { logicalId } from '../run-history/validation.js';
import { supportedModelId } from '../repair-context/model-id.js';

export type AnalyzeFailedAssertionDependencies = {
  readonly artifactReader: FailedAssertionRunArtifactReaderPort;
  readonly assistanceConfig: AssistanceConfigPort;
  readonly llm: FailureAnalysisLlmPort;
  readonly analysisStore: FailureAnalysisStorePort;
  readonly logger: AnalyzeFailedAssertionLoggerPort;
  readonly clock?: () => number;
};

export async function analyzeFailedAssertion(command: AnalyzeFailedAssertionCommand, dependencies: AnalyzeFailedAssertionDependencies): Promise<AnalyzeFailedAssertionResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const config = dependencies.assistanceConfig.getConfig();
  const metadata = { suiteId: command.suiteId, runId: command.runId, attempt: command.attempt, testCaseId: command.testCaseId, modelId: command.evalRunModelId, assertionId: command.assertionId };
  dependencies.logger.info({ event: 'failure_analysis_requested', ...metadata, assistanceModelLabel: config.assistanceModelLabel });

  const blockedScope = validateScope(command);
  if (blockedScope) return logBlocked(blockedScope, metadata, startedAt, dependencies);

  let selected;
  try {
    selected = await dependencies.artifactReader.read(command);
  } catch {
    return logBlocked(blocked('missing-artifact', 'The selected saved evidence could not be read.'), metadata, startedAt, dependencies);
  }
  if (selected.status === 'blocked') return logBlocked(blocked(
    selected.reason === 'non-failed-assertion' ? 'non-failed-assertion' : 'missing-artifact',
    'The selected failed assertion is unavailable in this saved run.'
  ), metadata, startedAt, dependencies);
  if (selected.value.evidence.suiteId !== command.suiteId
    || selected.value.evidence.runId !== command.runId
    || selected.value.evidence.attempt !== command.attempt
    || selected.value.evidence.testCaseId !== command.testCaseId
    || selected.value.evidence.assertionId !== command.assertionId) {
    return logBlocked(blocked('missing-assertion', 'The selected assertion no longer matches this saved run.'), metadata, startedAt, dependencies);
  }
  if (selected.value.testedModel !== command.evalRunModelId
    || selected.value.evidence.evalRunModelId !== command.evalRunModelId
    || selected.value.runScope !== (command.runScope.type === 'all' ? 'all' : 'selected')) {
    return logBlocked(blocked('invalid-scope', 'The selected model or scope does not match this saved run.'), metadata, startedAt, dependencies);
  }
  const evidence = selected.value.evidence;
  if (!config.hasOpenAiApiKey) {
    dependencies.logger.warn({ event: 'failure_analysis_unavailable', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'missing-openai-api-key', durationMs: elapsed(startedAt, dependencies) });
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
    const analysis = await dependencies.llm.analyzeFailure({ model: config.assistanceModelLabel, evidence });
    const analysisId = dependencies.analysisStore.save(command, analysis);
    dependencies.logger.info({ event: 'failure_analysis_completed', ...metadata, assistanceModelLabel: config.assistanceModelLabel, durationMs: elapsed(startedAt, dependencies), outcome: 'analysis-ready' });
    return { status: 'analysis-ready', analysisId, assistanceModelLabel: config.assistanceModelLabel, evidence, analysis };
  } catch {
    dependencies.logger.error({ event: 'failure_analysis_failed', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'llm-failure', durationMs: elapsed(startedAt, dependencies) });
    return { status: 'error', reason: 'llm-failure', message: 'Failure analysis could not be completed. Try again later.', assistanceModelLabel: config.assistanceModelLabel, evidence };
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

function logBlocked(result: AnalyzeFailedAssertionBlockedResult, metadata: { readonly suiteId: string; readonly runId: string; readonly attempt: number; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string }, startedAt: number, dependencies: AnalyzeFailedAssertionDependencies): AnalyzeFailedAssertionBlockedResult {
  dependencies.logger.warn({ event: 'failure_analysis_blocked', ...metadata, reason: result.reason, durationMs: elapsed(startedAt, dependencies) });
  return result;
}

function elapsed(startedAt: number, dependencies: AnalyzeFailedAssertionDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
