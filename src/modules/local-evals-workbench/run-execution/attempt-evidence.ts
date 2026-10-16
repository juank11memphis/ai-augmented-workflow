import type { EvalGrader } from '../discover-conventional-eval-suites/index.js';
import type { AssertionEvidence } from '../run-history/contracts.js';
import type { ExecutionEvent, SourceRecord } from './contracts.js';

type GraderEvent = Extract<ExecutionEvent, { type: 'grader-completed' }>;

/** Defense-in-depth at the handler boundary before untrusted judge bytes reach the store. */
export function validJudgeSource(record: SourceRecord): boolean {
  if (record.kind !== 'judge-exchange') return false;
  if (Object.keys(record).some(key => !['kind', 'id', 'turnId', 'checkId', 'judgeModel', 'eventSequence', 'elapsedMs',
    'evaluatedRubric', 'request', 'response', 'rationale', 'redactedFields', 'result'].includes(key))) return false;
  const id = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value);
  const text = (value: unknown) => typeof value === 'string' && Buffer.byteLength(value) <= 256_000;
  const score = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
  if (!id(record.id) || !id(record.turnId) || !id(record.checkId) || !text(record.judgeModel) || !record.judgeModel
    || !Number.isSafeInteger(record.eventSequence) || record.eventSequence < 0
    || !Number.isSafeInteger(record.elapsedMs) || record.elapsedMs < 0
    || !text(record.evaluatedRubric) || !text(record.request)
    || record.response !== undefined && !text(record.response) || record.rationale !== undefined && !text(record.rationale)
    || record.redactedFields !== undefined && (!Array.isArray(record.redactedFields)
      || new Set(record.redactedFields).size !== record.redactedFields.length
      || record.redactedFields.some(field => !['evaluatedRubric', 'request', 'response', 'rationale'].includes(field)))
    || !record.result || typeof record.result !== 'object' || Array.isArray(record.result)) return false;
  return record.result.status === 'completed'
    ? Object.keys(record.result).every(key => ['status', 'score', 'threshold', 'passed'].includes(key))
      && Object.keys(record.result).length === 4
      && score(record.result.score) && score(record.result.threshold) && typeof record.result.passed === 'boolean'
      && record.result.passed === (record.result.score >= record.result.threshold)
      && record.response !== undefined && record.rationale !== undefined
    : record.result.status === 'grading-error' && Object.keys(record.result).length === 2
      && Object.keys(record.result).every(key => ['status', 'code'].includes(key))
      && /^[a-z][a-z0-9-]{0,79}$/.test(record.result.code);
}

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
