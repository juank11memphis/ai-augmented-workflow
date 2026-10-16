import type { NormalizedEvalTestCase } from './discover-conventional-eval-suites/index.js';
import type { RuntimeOutcome } from './runtime-description.js';

/** Shared selection boundary for preview and start; neither slice owns the other's internals. */
export type RunSelectionCommand = {
  readonly suiteId: string;
  readonly scope: { readonly type: 'all' } | { readonly type: 'test_case'; readonly testCaseId: string };
  /** Legacy client hint. Saved defaults, not this value, govern full-suite execution. */
  readonly model?: string;
  readonly judgeModel?: string | null;
  readonly runOnly?: { readonly testedModel?: string; readonly judgeModel?: string };
  /** Opaque identity of the suite and runner description shown by preview. */
  readonly previewToken?: string;
};
export type RunSetupCommand = Omit<RunSelectionCommand, 'model'> & { readonly model?: string };
export interface ArtifactReadinessPort { check(): Promise<RuntimeOutcome<null>>; }
export interface CaseInputResolverPort { resolve(cases: readonly NormalizedEvalTestCase[]): Promise<RuntimeOutcome<readonly NormalizedEvalTestCase[]>>; }
