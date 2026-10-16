import type { Attempt, DeliveredToolEvidence, EvidenceField, ModelCallEvidence, SourceEvidence, StoredSourceRecord } from './contracts.js';

const INLINE_BYTES = 350;

function field(recordId: string, key: string, value: string, redacted: boolean): EvidenceField {
  if (redacted) return { status: 'gap', reason: 'redacted' };
  const byteLength = Buffer.byteLength(value, 'utf8');
  return { status: 'available', locator: `${recordId}~${key}`, byteLength,
    ...(byteLength <= INLINE_BYTES ? { value } : {}) };
}

/** Assemble only complete, owned records for the requested failed assertion. */
export function selectedSourceEvidence(attempt: Attempt, assertionId: string,
  records: readonly StoredSourceRecord[]): SourceEvidence | undefined {
  const capture = attempt.sourceCapture;
  if (!capture || capture.records.length === 0 && capture.gaps.length === 0) return undefined;
  const relevant = capture.records.filter(reference => reference.checkId === assertionId);
  if (records.length !== relevant.length || !relevant.every((reference, index) => {
    const stored = records[index];
    return stored?.record.id === reference.id && stored.sequence === reference.sequence
      && stored.record.checkId === assertionId && attempt.turns.some(turn => turn.id === stored.record.turnId);
  })) return undefined;
  const modelCalls: ModelCallEvidence[] = [];
  const toolEvents: DeliveredToolEvidence[] = [];
  const approvedFacts: SourceEvidence['approvedFacts'][number][] = [];
  for (const stored of records) {
    const source = stored.record;
    const hidden = (key: string): boolean => source.redactedFields?.some(field => field === key) ?? false;
    if (source.kind === 'model-call') {
      modelCalls.push({ id: source.id, turnId: source.turnId, sequence: stored.sequence, modelId: source.modelId,
        inputMessages: source.inputMessages.map((message, index) => ({ role: message.role,
          content: field(source.id, `inputMessages-${index}`, message.content, hidden('inputMessages')) })),
        rawText: field(source.id, 'rawText', source.rawText, hidden('rawText')),
        rawToolCalls: source.rawToolCalls.map((call, index) => ({ id: call.id, name: call.name,
          arguments: field(source.id, `rawToolCalls-${index}`, JSON.stringify(call.arguments), hidden('rawToolCalls')) })),
        normalizedOutput: field(source.id, 'normalizedOutput', source.normalizedOutput, hidden('normalizedOutput')) });
      for (const fact of source.approvedFacts ?? []) approvedFacts.push({ modelCallId: source.id, ...fact });
    } else {
      if (!modelCalls.some(call => call.id === source.modelCallId)) return undefined;
      toolEvents.push({ id: source.id, modelCallId: source.modelCallId, sequence: stored.sequence, name: source.name,
        request: field(source.id, 'request', JSON.stringify(source.request), hidden('request')),
        result: field(source.id, 'result', JSON.stringify(source.result), hidden('result')), outcome: source.outcome });
    }
  }
  return { version: 2, assertionId, modelCalls, toolEvents, approvedFacts,
    gaps: capture.gaps.map(gap => ({ ...gap })) };
}
