import type { StoredRunArtifact } from '../run-local-eval-suite/run-artifact-store.js';
import type { AnalyzeFailedAssertionRunScope } from './command.js';
import type { FailedAssertionEvidence } from './evidence.js';
import type { FailureAnalysis } from './result.js';

export type FailedAssertionRunArtifactReaderPort = {
  getRunArtifact(suiteId: string, modelId: string, scope: AnalyzeFailedAssertionRunScope['type'], testCaseId?: string): StoredRunArtifact | undefined;
};

export type AssistanceConfig = {
  readonly hasOpenAiApiKey: boolean;
  readonly assistanceModelLabel: string;
  readonly apiKey?: string;
};

export type AssistanceConfigPort = {
  getConfig(): AssistanceConfig;
};

export type FailureAnalysisLlmPort = {
  analyzeFailure(request: {
    readonly model: string;
    readonly evidence: FailedAssertionEvidence;
  }): Promise<FailureAnalysis>;
};

export type AnalyzeFailedAssertionLogEvent =
  | { readonly event: 'failure_analysis_requested'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string }
  | { readonly event: 'failure_analysis_unavailable'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly reason: string; readonly durationMs: number }
  | { readonly event: 'failure_analysis_completed'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly durationMs: number; readonly outcome: string }
  | { readonly event: 'failure_analysis_blocked'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly reason: string; readonly durationMs: number }
  | { readonly event: 'failure_analysis_failed'; readonly suiteId: string; readonly testCaseId: string; readonly modelId: string; readonly assertionId: string; readonly assistanceModelLabel: string; readonly reason: string; readonly durationMs: number };

export type AnalyzeFailedAssertionLoggerPort = {
  info(event: AnalyzeFailedAssertionLogEvent): void;
  warn(event: AnalyzeFailedAssertionLogEvent): void;
  error(event: AnalyzeFailedAssertionLogEvent): void;
};
