import type { EvalGrader } from '../discover-conventional-eval-suites/index.js';
import type { AssertionEvidence } from '../run-history/contracts.js';
import type { ExecutionEvent } from './contracts.js';

type GraderEvent = Extract<ExecutionEvent, { type: 'grader-completed' }>;

/** Runner-owned checks are accepted only when they match the declared, selected grader. */
export function normalizeGraderOutcomes(graders: readonly EvalGrader[], events: readonly GraderEvent[], judgeModel: string | null): readonly AssertionEvidence[] {
  if (events.length !== graders.length || new Set(events.map(event => event.checkId)).size !== events.length) throw new Error('grader-results-incomplete');
  return graders.map(grader => normalizeGraderOutcome(grader, events.find(item => item.checkId === grader.id), judgeModel));
}

export function normalizeGraderOutcome(grader: EvalGrader, event: GraderEvent | undefined, judgeModel: string | null): AssertionEvidence {
    if (!event || event.grader !== grader.type || !event.evidence || event.evidence.length > 500
      || event.diagnostics.length > 20 || event.diagnostics.some(item => item.length > 500)) throw new Error('grader-result-invalid');
    if (grader.type === 'rubric') {
      if (!judgeModel || event.judgeModel !== judgeModel || event.threshold !== grader.threshold
        || event.score === null || !Number.isFinite(event.score) || event.score < 0 || event.score > 1
        || event.passed !== (event.score >= grader.threshold)) throw new Error('rubric-result-invalid');
    } else if (event.judgeModel !== undefined || event.threshold !== undefined || event.score !== null && (!Number.isFinite(event.score) || event.score < 0 || event.score > 1)) {
      throw new Error('custom-result-invalid');
    }
    return { id: grader.id, kind: 'grader', outcome: event.passed ? 'passed' : 'failed', score: event.score,
      ...(grader.type === 'rubric' ? { threshold: grader.threshold, judgeModel: judgeModel! } : {}),
      expected: grader.type === 'rubric' ? `score >= ${grader.threshold}` : grader.name,
      actual: event.evidence, diagnostics: event.diagnostics, turnIds: [], toolIds: [] };
}
