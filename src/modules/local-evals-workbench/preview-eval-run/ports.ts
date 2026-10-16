export type { RunnerDescriptorPort, SuiteRuntimeRegistryPort } from '../runtime-ports.js';
export type { ArtifactReadinessPort, CaseInputResolverPort } from '../run-configuration.js';
import type { PreviewStage } from './result.js';
import type { SelectionBlockReason } from '../resolve-eval-run-selection/result.js';

export interface PreviewOutcomeLoggerPort {
  record(event: {
    readonly event: 'eval_preview_started' | 'eval_preview_blocked' | 'eval_preview_failed' | 'eval_preview_completed';
    readonly stage: 'preview' | PreviewStage;
    readonly outcome: 'started' | 'blocked' | 'failed' | 'completed';
    readonly reason?: SelectionBlockReason | 'unknown-cause';
    readonly durationMs: number;
  }): void;
}
