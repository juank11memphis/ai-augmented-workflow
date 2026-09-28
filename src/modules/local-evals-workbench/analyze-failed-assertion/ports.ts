import type { FailedAssertionEvidence } from '../repair-context/contracts.js';
import type { FailureAnalysis } from '../repair-context/contracts.js';
import type { AssistanceConfig } from '../repair-context/assistance-config.js';
export type { AssistanceConfig } from '../repair-context/assistance-config.js';
import type { SelectedFailureReader } from '../repair-context/selected-evidence.js';
import type { FailureSelection } from '../repair-context/selected-evidence.js';

export type FailedAssertionRunArtifactReaderPort = SelectedFailureReader;
export type FailureAnalysisStorePort = { save(selection: FailureSelection, analysis: FailureAnalysis): string };

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
