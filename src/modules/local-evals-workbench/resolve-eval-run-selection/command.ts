import type { EvalRunScope } from '../run-local-eval-suite/command.js';

export type RunOnlyModelChoice = {
  readonly testedModel?: string;
  readonly judgeModel?: string;
};

/** Shared intent for preview and start; neither operation may mutate saved choices. */
export type ResolveEvalRunSelectionCommand = {
  readonly suiteId: string;
  readonly scope: EvalRunScope;
  readonly runOnly?: RunOnlyModelChoice;
};
