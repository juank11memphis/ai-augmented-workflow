export type { RunnerDescriptorPort, SuiteRuntimeRegistryPort } from '../runtime-ports.js';
export type { RunnerEstimatorPort, ArtifactReadinessPort, CaseInputResolverPort } from '../run-configuration.js';
import type { RuntimeBlockReason } from '../runtime-description.js';
import type { PreviewStage } from './result.js';

export interface PreviewOutcomeLoggerPort {
  record(event: {
    readonly event: 'eval_preview_started' | 'eval_preview_blocked' | 'eval_preview_failed' | 'eval_preview_completed';
    readonly stage: 'preview' | PreviewStage;
    readonly outcome: 'started' | 'blocked' | 'failed' | 'completed';
    readonly reason?: RuntimeBlockReason | 'unknown-cause';
    readonly durationMs: number;
  }): void;
}
