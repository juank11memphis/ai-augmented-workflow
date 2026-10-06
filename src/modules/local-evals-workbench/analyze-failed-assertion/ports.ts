import type { FailedAssertionEvidence } from '../repair-context/contracts.js';
import type { FailureAnalysis } from '../repair-context/contracts.js';
import type { AssistanceConfig } from '../repair-context/assistance-config.js';
export type { AssistanceConfig } from '../repair-context/assistance-config.js';
import type { SelectedFailureReader } from '../repair-context/selected-evidence.js';
import type { FailureSelection } from '../repair-context/selected-evidence.js';
import type { AnalyzeFailedAssertionBlockedResult, AnalyzeFailedAssertionErrorResult } from './result.js';
import type { AnalysisContext, AnalysisContextReaderPort } from './context-reader.js';

export type FailedAssertionRunArtifactReaderPort = SelectedFailureReader;
export type FailureAnalysisStorePort = { save(selection: FailureSelection, analysis: FailureAnalysis): string };
export type { AnalysisContextReaderPort };

export type AssistanceConfigPort = {
  getConfig(): AssistanceConfig;
};

export type FailureAnalysisLlmPort = {
  analyzeFailure(request: {
    readonly model: string;
    readonly evidence: FailedAssertionEvidence;
    readonly context?: AnalysisContext;
  }): Promise<FailureAnalysis>;
};

export type FailureAnalysisProviderCategory =
  | 'authorization'
  | 'rate-limit'
  | 'timeout'
  | 'unavailable'
  | 'invalid-response'
  | 'unknown';

export class FailureAnalysisProviderError extends Error {
  constructor(readonly category: FailureAnalysisProviderCategory) {
    super('Failure analysis provider failed');
    this.name = 'FailureAnalysisProviderError';
  }
}

export type AnalyzeFailedAssertionLogEvent =
  | { readonly event: 'failure_analysis_requested'; readonly stage: 'analysis'; readonly outcome: 'started' }
  | { readonly event: 'failure_analysis_finished'; readonly stage: 'analysis'; readonly outcome: 'completed' | 'blocked' | 'failed'; readonly reason: AnalyzeFailedAssertionBlockedResult['reason'] | AnalyzeFailedAssertionErrorResult['reason'] | 'missing-openai-api-key' | 'analysis-ready'; readonly durationMs: number };

export type AnalyzeFailedAssertionLoggerPort = {
  info(event: AnalyzeFailedAssertionLogEvent): void;
  warn(event: AnalyzeFailedAssertionLogEvent): void;
  error(event: AnalyzeFailedAssertionLogEvent): void;
};
