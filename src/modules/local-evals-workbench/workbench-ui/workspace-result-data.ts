import type { EvalSuiteSummary } from '../discover-conventional-eval-suites/result.js';
import type { Manifest, Selection } from '../run-history/contracts.js';

export type CompletedCaseResult = {
  readonly caseId: string;
  readonly name: string;
  readonly status: 'passed' | 'failed';
  readonly model: string;
  readonly judgeModel: string | null;
  readonly detail: Selection;
};

/** Project labels only from recorded run evidence, never current suite choices. */
export function completedCaseResults(run: Manifest | null, suite: EvalSuiteSummary | null): readonly CompletedCaseResult[] {
  if (!run) return [];
  return run.caseIds.flatMap(caseId => {
    const record = run.cases.find(item => item.caseId === caseId);
    if (record?.state !== 'completed') return [];
    const attempt = record.attempts.at(-1);
    if (!attempt || attempt.outcome === 'incomplete') return [];
    return [{
      caseId,
      name: suite?.testCases.find(item => item.id === caseId)?.name ?? caseId,
      status: attempt.outcome,
      model: run.testedModel,
      judgeModel: run.judgeModel,
      detail: { caseId, attempt: attempt.number },
    }];
  });
}
