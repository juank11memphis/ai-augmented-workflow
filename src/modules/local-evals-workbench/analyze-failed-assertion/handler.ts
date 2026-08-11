import type { AnalyzeFailedAssertionCommand } from './command.js';
import { buildFailedAssertionEvidence } from './evidence.js';
import type { AnalyzeFailedAssertionLoggerPort, AssistanceConfigPort, FailedAssertionRunArtifactReaderPort, FailureAnalysisLlmPort } from './ports.js';
import type { AnalyzeFailedAssertionBlockedResult, AnalyzeFailedAssertionResult } from './result.js';

export type AnalyzeFailedAssertionDependencies = {
  readonly artifactReader: FailedAssertionRunArtifactReaderPort;
  readonly assistanceConfig: AssistanceConfigPort;
  readonly llm: FailureAnalysisLlmPort;
  readonly logger: AnalyzeFailedAssertionLoggerPort;
  readonly clock?: () => number;
};

export async function analyzeFailedAssertion(command: AnalyzeFailedAssertionCommand, dependencies: AnalyzeFailedAssertionDependencies): Promise<AnalyzeFailedAssertionResult> {
  const startedAt = (dependencies.clock ?? Date.now)();
  const config = dependencies.assistanceConfig.getConfig();
  const metadata = { suiteId: command.suiteId, testCaseId: command.testCaseId, modelId: command.evalRunModelId, assertionId: command.assertionId };
  dependencies.logger.info({ event: 'failure_analysis_requested', ...metadata, assistanceModelLabel: config.assistanceModelLabel });

  const blockedScope = validateScope(command);
  if (blockedScope) return logBlocked(blockedScope, metadata, startedAt, dependencies);

  const artifact = dependencies.artifactReader.getRunArtifact(command.suiteId, command.evalRunModelId, command.runScope.type, command.runScope.type === 'test_case' ? command.runScope.testCaseId : undefined);
  if (!artifact) return logBlocked(blocked('missing-artifact', 'Run evidence was not found. Run the eval before requesting analysis.'), metadata, startedAt, dependencies);

  const cell = artifact.matrix.rows.find((row) => row.testCaseId === command.testCaseId)?.cells.find((candidate) => candidate.modelId === command.evalRunModelId);
  if (!cell) return logBlocked(blocked('missing-cell', 'The selected result cell was not found in the stored run.'), metadata, startedAt, dependencies);

  const assertion = cell.assertions.find((candidate) => candidate.id === command.assertionId);
  if (!assertion) return logBlocked(blocked('missing-assertion', 'The selected assertion was not found in the stored result cell.'), metadata, startedAt, dependencies);
  if (assertion.status !== 'failed') return logBlocked(blocked('non-failed-assertion', 'Only failed assertions can be analyzed.'), metadata, startedAt, dependencies);

  const evidence = buildFailedAssertionEvidence({ suiteId: command.suiteId, cell, assertion });
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
    dependencies.logger.info({ event: 'failure_analysis_completed', ...metadata, assistanceModelLabel: config.assistanceModelLabel, durationMs: elapsed(startedAt, dependencies), outcome: 'analysis-ready' });
    return { status: 'analysis-ready', assistanceModelLabel: config.assistanceModelLabel, evidence, analysis };
  } catch {
    dependencies.logger.error({ event: 'failure_analysis_failed', ...metadata, assistanceModelLabel: config.assistanceModelLabel, reason: 'llm-failure', durationMs: elapsed(startedAt, dependencies) });
    return { status: 'error', reason: 'llm-failure', message: 'Failure analysis could not be completed. Try again later.', assistanceModelLabel: config.assistanceModelLabel, evidence };
  }
}

function validateScope(command: AnalyzeFailedAssertionCommand): AnalyzeFailedAssertionBlockedResult | null {
  if (command.runScope.type === 'test_case' && command.runScope.testCaseId !== command.testCaseId) {
    return blocked('invalid-scope', 'Analysis must stay scoped to the active failed assertion test case.');
  }
  return null;
}

function blocked(reason: AnalyzeFailedAssertionBlockedResult['reason'], message: string): AnalyzeFailedAssertionBlockedResult {
  return { status: 'blocked', reason, message };
}

function logBlocked(result: AnalyzeFailedAssertionBlockedResult, metadata: { readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string }, startedAt: number, dependencies: AnalyzeFailedAssertionDependencies): AnalyzeFailedAssertionBlockedResult {
  dependencies.logger.warn({ event: 'failure_analysis_blocked', ...metadata, reason: result.reason, durationMs: elapsed(startedAt, dependencies) });
  return result;
}

function elapsed(startedAt: number, dependencies: AnalyzeFailedAssertionDependencies): number {
  return Math.max(0, (dependencies.clock ?? Date.now)() - startedAt);
}
