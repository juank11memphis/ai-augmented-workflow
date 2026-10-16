import type { SourceRecord } from '../run-execution/contracts.js';
import type { AssertionEvidence, StoredSourceRecord } from './contracts.js';
import { LIMITS } from './limits.js';
import { integer, logicalId, record } from './validation.js';

function bounded(value: unknown, max: number): value is string {
  return typeof value === 'string' && Buffer.byteLength(value) <= max;
}
function keys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  return required.every(key => key in value) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
function sourceRecord(value: unknown): value is SourceRecord {
  if (!record(value) || !logicalId(value.id) || !logicalId(value.turnId) || !logicalId(value.checkId)
    || !integer(value.elapsedMs)) return false;
  if (value.kind === 'judge-exchange') return keys(value,
    ['kind', 'id', 'turnId', 'checkId', 'judgeModel', 'eventSequence', 'elapsedMs', 'evaluatedRubric', 'request', 'result'],
    ['response', 'rationale', 'redactedFields'])
    && bounded(value.judgeModel, 200) && value.judgeModel.length > 0 && integer(value.eventSequence)
    && bounded(value.evaluatedRubric, LIMITS.sourceRecordBytes) && bounded(value.request, LIMITS.sourceRecordBytes)
    && (value.response === undefined || bounded(value.response, LIMITS.sourceRecordBytes))
    && (value.rationale === undefined || bounded(value.rationale, LIMITS.sourceRecordBytes))
    && redactions(value.redactedFields, ['evaluatedRubric', 'request', 'response', 'rationale'])
    && record(value.result) && (value.result.status === 'completed'
      ? keys(value.result, ['status', 'score', 'threshold', 'passed'])
        && typeof value.result.score === 'number' && Number.isFinite(value.result.score) && value.result.score >= 0 && value.result.score <= 1
        && typeof value.result.threshold === 'number' && Number.isFinite(value.result.threshold) && value.result.threshold >= 0 && value.result.threshold <= 1
        && value.result.passed === (value.result.score >= value.result.threshold)
        && value.response !== undefined && value.rationale !== undefined
      : value.result.status === 'grading-error' && keys(value.result, ['status', 'code'])
        && typeof value.result.code === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value.result.code));
  if (value.kind === 'model-call') return keys(value,
    ['kind', 'id', 'turnId', 'checkId', 'modelId', 'phase', 'elapsedMs', 'inputMessages', 'rawText', 'rawToolCalls', 'normalizedOutput'],
    ['approvedFacts', 'redactedFields'])
    && redactions(value.redactedFields, ['inputMessages', 'rawText', 'rawToolCalls', 'normalizedOutput'])
    && (value.approvedFacts === undefined || Array.isArray(value.approvedFacts) && value.approvedFacts.length <= 100
      && value.approvedFacts.every(fact => record(fact) && keys(fact, ['factId', 'provenance'])
        && logicalId(fact.factId) && bounded(fact.provenance, 1000)))
    && bounded(value.modelId, 200) && (value.phase === 'initial' || value.phase === 'post-tool')
    && Array.isArray(value.inputMessages) && value.inputMessages.length <= 100
    && value.inputMessages.every(message => record(message) && keys(message, ['role', 'content'])
      && ['system', 'user', 'assistant', 'tool'].includes(String(message.role))
      && bounded(message.content, LIMITS.sourceRecordBytes))
    && bounded(value.rawText, LIMITS.sourceRecordBytes) && bounded(value.normalizedOutput, LIMITS.sourceRecordBytes)
    && Array.isArray(value.rawToolCalls) && value.rawToolCalls.length <= 100
    && value.rawToolCalls.every(call => record(call) && keys(call, ['id', 'name', 'arguments']) && logicalId(call.id) && bounded(call.name, 200)
      && call.arguments !== undefined);
  return value.kind === 'tool-delivery' && keys(value,
    ['kind', 'id', 'turnId', 'checkId', 'modelCallId', 'name', 'request', 'result', 'outcome', 'elapsedMs'], ['redactedFields'])
    && redactions(value.redactedFields, ['request', 'result'])
    && logicalId(value.modelCallId) && bounded(value.name, 200)
    && ['result', 'error', 'unexpected-response'].includes(String(value.outcome))
    && value.request !== undefined && value.result !== undefined;
}
function redactions(value: unknown, allowed: readonly string[]): boolean {
  return value === undefined || Array.isArray(value) && value.length <= allowed.length
    && new Set(value).size === value.length && value.every(field => allowed.includes(String(field)));
}

export function storedSourceRecord(value: unknown): value is StoredSourceRecord {
  return record(value) && Object.keys(value).every(key =>
    ['version', 'suiteId', 'runId', 'caseId', 'attempt', 'sequence', 'status', 'byteLength', 'record'].includes(key))
    && value.version === 1 && [value.suiteId, value.runId, value.caseId].every(logicalId)
    && value.attempt === 1 && integer(value.sequence, LIMITS.evidenceItems)
    && value.status === 'complete' && value.byteLength === Buffer.byteLength(JSON.stringify(value.record))
    && sourceRecord(value.record)
    && Buffer.byteLength(JSON.stringify(value)) <= LIMITS.sourceRecordBytes;
}

export function sourceField(recordValue: SourceRecord, key: string): string | undefined {
  if (recordValue.kind === 'model-call') {
    if (key === 'rawText' || key === 'normalizedOutput') return recordValue[key];
    const input = /^inputMessages-([0-9]{1,2})$/.exec(key);
    if (input) return recordValue.inputMessages[Number(input[1])]?.content;
    const call = /^rawToolCalls-([0-9]{1,2})$/.exec(key);
    if (call && recordValue.rawToolCalls[Number(call[1])]) return JSON.stringify(recordValue.rawToolCalls[Number(call[1])]!.arguments);
  } else if (recordValue.kind === 'judge-exchange') {
    if (key === 'evaluatedRubric' || key === 'request' || key === 'response' || key === 'rationale') return recordValue[key];
  } else if (key === 'request' || key === 'result') return JSON.stringify(recordValue[key]);
  return undefined;
}

export function judgeMatchesAssertion(recordValue: SourceRecord, assertions: readonly AssertionEvidence[]): boolean {
  if (recordValue.kind !== 'judge-exchange') return true;
  const assertion = assertions.find(item => item.id === recordValue.checkId);
  if (!assertion || assertion.kind !== 'grader') return false;
  if (recordValue.result.status === 'grading-error') return assertion.gradingError?.code === recordValue.result.code
    && assertion.score === null && assertion.outcome === 'incomplete';
  return assertion.judgeModel === recordValue.judgeModel && assertion.score === recordValue.result.score
    && assertion.threshold === recordValue.result.threshold
    && assertion.outcome === (recordValue.result.passed ? 'passed' : 'failed');
}
