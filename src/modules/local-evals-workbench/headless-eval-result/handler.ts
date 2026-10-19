import type { HeadlessEvalResultCommand } from './command.js';
import type { HeadlessEvalResultDependencies } from './ports.js';
import type { HeadlessEvalResult, HeadlessEvalSummary, SelectedEvidenceField, SelectedGrading, SelectedSourceEvidence } from './result.js';
import { failedAssertionLocators } from '../run-history/failed-assertion-locators.js';
import type { AssertionEvidence, EvidenceField, SourceEvidence } from '../run-history/contracts.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_TEXT = 600;
const MAX_DIAGNOSTICS = 3;
const MAX_JSON = 4800;
const MAX_FIELD_BYTES = 1024;
const SAFE_CODE = /^[a-z][a-z0-9-]{0,79}$/;
const RESPONSE_LOCATOR = /^[A-Za-z0-9._/-]{1,240}$/;

function safeArtifactPath(path: string | undefined): string | undefined {
  return path && /^(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9._/-]+$/.test(path) && !path.startsWith('/') ? path : undefined;
}

function clipped(value: string): string {
  return value.length <= MAX_TEXT ? value : `${value.slice(0, MAX_TEXT - 1)}…`;
}

function fieldsOf(source: SourceEvidence): EvidenceField[] {
  return [
    ...source.modelCalls.flatMap(call => [
      ...call.inputMessages.map(message => message.content), call.rawText,
      ...call.rawToolCalls.map(tool => tool.arguments), call.normalizedOutput,
    ]),
    ...source.toolEvents.flatMap(event => [event.request, event.result]),
    ...(source.judge ? [source.judge.evaluatedRubric, source.judge.request, source.judge.response, source.judge.rationale] : []),
  ];
}

function projectGrading(assertion: AssertionEvidence, source: SourceEvidence | undefined): SelectedGrading {
  if (assertion.kind !== 'grader' || assertion.judgeModel === undefined && assertion.threshold === undefined && !source?.judge) {
    return { kind: 'deterministic' };
  }
  const judge = source?.judge;
  return { kind: 'rubric',
    evaluatedRubric: judge ? projectField(judge.evaluatedRubric) : { status: 'gap', reason: 'not-captured' },
    score: assertion.score, threshold: assertion.threshold ?? null, comparison: assertion.outcome,
    judgeModel: judge?.judgeModel ?? assertion.judgeModel ?? null,
    ...(assertion.gradingError || judge?.error ? { error: assertion.gradingError ?? judge?.error } : {}),
    judge: judge ? { version: 1, request: projectField(judge.request), response: projectField(judge.response),
      rationale: projectField(judge.rationale), ...(judge.error ? { error: judge.error } : {}) }
      : { status: 'gap', reason: 'not-captured' },
  };
}

function projectField(field: EvidenceField): SelectedEvidenceField {
  if (field.status === 'gap') return field;
  const inline = field.value !== undefined && Buffer.byteLength(field.value, 'utf8') === field.byteLength && field.byteLength <= MAX_TEXT;
  return { status: 'available', locator: field.locator, byteLength: field.byteLength,
    truncated: !inline, ...(inline ? { value: field.value } : {}) };
}

function projectSource(source: SourceEvidence): SelectedSourceEvidence {
  const orderedEvents = [
    ...source.modelCalls.map(call => ({ kind: 'model-call' as const, id: call.id, order: call.sequence })),
    ...source.toolEvents.map(event => ({ kind: 'tool-delivery' as const, id: event.id, order: event.sequence })),
  ].sort((a, b) => a.order - b.order);
  const sequence: SelectedSourceEvidence['sequence'] = [
    ...orderedEvents,
    ...(source.judge ? [{ kind: 'judge-exchange' as const, id: source.assertionId }] : []),
  ];
  return { version: 2,
    sequence,
    modelCalls: [...source.modelCalls].sort((a, b) => a.sequence - b.sequence).map(call => ({
      id: call.id, turnId: call.turnId, sequence: call.sequence, modelId: call.modelId,
      inputMessages: call.inputMessages.map(message => ({ role: message.role, content: projectField(message.content) })),
      rawText: projectField(call.rawText),
      rawToolCalls: call.rawToolCalls.map(tool => ({ id: tool.id, name: tool.name, arguments: projectField(tool.arguments) })),
      normalizedOutput: projectField(call.normalizedOutput),
    })),
    toolEvents: [...source.toolEvents].sort((a, b) => a.sequence - b.sequence).map(event => ({
      id: event.id, modelCallId: event.modelCallId, sequence: event.sequence, name: event.name,
      request: projectField(event.request), result: projectField(event.result), outcome: event.outcome,
    })),
    approvedFacts: source.approvedFacts,
    ...(source.gaps ? { gaps: source.gaps } : {}),
  };
}

export async function headlessEvalResult(command: HeadlessEvalResultCommand, dependencies: HeadlessEvalResultDependencies): Promise<HeadlessEvalResult> {
  const { selection } = command;
  if (!ID.test(command.suiteId) || !ID.test(command.runId) ||
    selection && (!ID.test(selection.caseId) || !Number.isSafeInteger(selection.attempt) || selection.attempt < 1 || selection.assertionId !== undefined && !ID.test(selection.assertionId)) ||
    command.locatorOffset !== undefined && (selection || command.field || !Number.isSafeInteger(command.locatorOffset) || command.locatorOffset < 0) ||
    command.field && (!selection || !(selection.assertionId === undefined ? RESPONSE_LOCATOR
      : /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}~[A-Za-z][A-Za-z0-9-]{0,40}$/).test(command.field.locator)
      || !Number.isSafeInteger(command.field.offset) || command.field.offset < 0)) {
    return { status: 'blocked', reason: 'invalid-input' };
  }
  let read;
  try { read = await dependencies.reader.get(command.suiteId, command.runId, selection); }
  catch { return { status: 'blocked', reason: 'unavailable' }; }
  if (read.status === 'blocked') {
    const reason = read.reason === 'unsafe-path' || read.reason === 'not-ignored' || read.reason === 'tracked-artifacts' || read.reason === 'unverifiable-root'
      ? 'unsafe-artifact' : read.reason === 'not-found' ? 'missing-artifact' : read.reason === 'corrupt' ? 'corrupt-artifact' : 'unavailable';
    return { status: 'blocked', reason };
  }
  const { summary: manifest, evidence, evidenceStatus, reviewArtifactPath } = read.value;
  if (manifest.suiteId !== command.suiteId || manifest.runId !== command.runId) return { status: 'blocked', reason: 'corrupt-artifact' };
  const locators = selection ? undefined : await failedAssertionLocators(manifest, dependencies.reader, command.locatorOffset ?? 0);
  const summary: HeadlessEvalSummary = {
    suiteId: manifest.suiteId, runId: manifest.runId, state: manifest.state, outcome: manifest.outcome,
    scope: manifest.scope, testedModel: manifest.testedModel, judgeModel: manifest.judgeModel,
    counts: { completed: manifest.cases.filter(item => item.state === 'completed').length,
      incomplete: manifest.cases.filter(item => item.state === 'incomplete').length,
      notRun: manifest.cases.filter(item => item.state === 'not-run').length },
    ...(manifest.failureProvenance ? { failureProvenance: manifest.failureProvenance } : {}),
    cases: selection ? manifest.cases.map(item => ({ caseId: item.caseId, state: item.state,
      testedModel: item.testedModel ?? manifest.testedModel, judgeModel: item.judgeModel !== undefined ? item.judgeModel : manifest.judgeModel,
      attempts: item.attempts.map(attempt => ({ number: attempt.number, outcome: attempt.outcome })) }))
      : locators!.cases,
    ...(locators?.nextLocatorOffset !== null && locators?.nextLocatorOffset !== undefined ? { nextLocatorOffset: locators.nextLocatorOffset } : {}),
  };
  const artifactPath = safeArtifactPath(reviewArtifactPath);
  if (!selection) {
    const result = { status: 'ready' as const, summary, ...(artifactPath ? { artifactPath } : {}) };
    return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
  }
  if (evidenceStatus !== 'available' || !evidence) return { status: 'blocked', reason: 'missing-artifact' };
  if (evidence.suiteId !== command.suiteId || evidence.runId !== command.runId || evidence.caseId !== selection.caseId || evidence.number !== selection.attempt ||
    !manifest.cases.some(item => item.caseId === selection.caseId && item.attempts.some(attempt => attempt.number === selection.attempt))) {
    return { status: 'blocked', reason: 'selection-mismatch' };
  }
  if (selection.assertionId === undefined) {
    const selectedCase = manifest.cases.find(item => item.caseId === selection.caseId);
    const selectedAttempt = selectedCase?.attempts.find(item => item.number === selection.attempt);
    if (selectedCase?.state !== 'incomplete' || selectedAttempt?.outcome !== 'incomplete' || evidence.outcome !== 'incomplete')
      return { status: 'blocked', reason: 'selection-mismatch' };
    const links = (evidence.diagnosticLinks ?? []).slice(0, MAX_DIAGNOSTICS);
    const captured = evidence.providerResponses;
    const source = captured ? { status: 'available' as const,
      records: captured.records.slice(0, 6).map(record => ({
        callId: record.callId, provisionalTurnId: record.provisionalTurnId, locator: record.locator,
        ...(record.role === undefined ? {} : { role: record.role }),
        ...(record.checkId === undefined ? {} : { checkId: record.checkId }),
        status: record.status, byteLength: record.byteLength,
        ...(record.contentType ? { contentType: record.contentType } : {}),
        ...(record.originalByteLength !== undefined ? { originalByteLength: record.originalByteLength,
          missingByteLength: record.originalByteLength - record.byteLength } : {}),
      })), gaps: captured.gaps.slice(0, 6),
      truncated: captured.records.length > 6 || captured.gaps.length > 6,
    } : { status: 'gap' as const, reason: 'not-captured' as const };
    if (command.field) {
      const matching = captured?.records.filter(record => record.locator === command.field!.locator) ?? [];
      if (matching.length !== 1 || command.field.offset >= matching[0]!.byteLength || !dependencies.reader.readProviderResponse)
        return { status: 'blocked', reason: 'selection-mismatch' };
      let range;
      try { range = await dependencies.reader.readProviderResponse(command.suiteId, command.runId, {
        ...selection, providerResponse: { role: matching[0]!.role ?? 'tested-model',
          ...(matching[0]!.checkId === undefined ? {} : { checkId: matching[0]!.checkId }) },
      },
        command.field.locator, command.field.offset, MAX_FIELD_BYTES); }
      catch { return { status: 'blocked', reason: 'unavailable' }; }
      if (range.status === 'blocked') return { status: 'blocked', reason: range.reason === 'not-found' ? 'missing-artifact'
        : ['unsafe-path', 'not-ignored', 'tracked-artifacts', 'unverifiable-root'].includes(range.reason) ? 'unsafe-artifact'
          : range.reason === 'corrupt' ? 'corrupt-artifact' : 'unavailable' };
      const value = range.value;
      const next = command.field.offset + value.bytes.length;
      if (value.locator !== command.field.locator || value.offset !== command.field.offset || value.byteLength !== value.bytes.length ||
        value.bytes.length < 1 || value.bytes.length > MAX_FIELD_BYTES ||
        value.nextOffset !== (next === matching[0]!.byteLength ? null : next) || next > matching[0]!.byteLength)
        return { status: 'blocked', reason: 'corrupt-artifact' };
      const result = { status: 'ready' as const, summary, field: { locator: value.locator, offset: value.offset,
        byteLength: matching[0]!.byteLength, bytesBase64: Buffer.from(value.bytes).toString('base64'), nextOffset: value.nextOffset } };
      return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
    }
    const result = { status: 'ready' as const, summary, incompleteAttempt: {
      caseId: selection.caseId, attempt: selection.attempt, state: 'incomplete' as const,
      diagnostics: evidence.diagnostics.filter(code => SAFE_CODE.test(code)).slice(0, MAX_DIAGNOSTICS),
      diagnosticLinks: links,
      ...(evidence.failureProvenance || manifest.failureProvenance ? { failureProvenance: evidence.failureProvenance ?? manifest.failureProvenance } : {}),
      turnIds: [...new Set(links.flatMap(link => link.turnId ? [link.turnId] : []))],
      callIds: [...new Set(links.flatMap(link => link.callId ? [link.callId] : []))],
      source,
    } };
    return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
  }
  const assertionSelection = { caseId: selection.caseId, attempt: selection.attempt, assertionId: selection.assertionId };
  const assertion = evidence.assertions.find(item => item.id === selection.assertionId);
  if (!assertion || evidence.assertions.length !== 1) return { status: 'blocked', reason: 'selection-mismatch' };
  let source = evidence.sourceEvidence;
  if (!source && dependencies.reader.readSource) {
    let assembled;
    try { assembled = await dependencies.reader.readSource(command.suiteId, command.runId, assertionSelection); }
    catch { return { status: 'blocked', reason: 'unavailable' }; }
    if (assembled.status === 'blocked') return { status: 'blocked', reason: assembled.reason === 'corrupt' ? 'corrupt-artifact'
      : ['unsafe-path', 'not-ignored', 'tracked-artifacts', 'unverifiable-root'].includes(assembled.reason)
        ? 'unsafe-artifact' : 'unavailable' };
    source = assembled.value;
  }
  if (source && (source.version !== 2 || source.assertionId !== selection.assertionId)) {
    return { status: 'blocked', reason: 'selection-mismatch' };
  }
  if (source?.judge && assertion.judgeModel && source.judge.judgeModel !== assertion.judgeModel) {
    return { status: 'blocked', reason: 'corrupt-artifact' };
  }
  const grading = projectGrading(assertion, source);
  const isFailedAssertion = evidence.outcome === 'failed' && assertion.outcome === 'failed' &&
    (grading.kind !== 'rubric' || grading.score !== null);
  const isGradingIssue = grading.kind === 'rubric' && assertion.outcome === 'incomplete' && assertion.score === null &&
    (assertion.gradingError !== undefined || source?.judge?.error !== undefined);
  const isExecutionIssue = !isGradingIssue && assertion.outcome === 'incomplete' && evidence.outcome === 'incomplete' &&
    (manifest.state === 'partial' || manifest.state === 'error' || manifest.state === 'interrupted' ||
      source?.toolEvents.some(event => event.outcome === 'error'));
  if (!isFailedAssertion && !isGradingIssue && !isExecutionIssue) return { status: 'blocked', reason: 'non-failed-assertion' };
  if (command.field) {
    const matching = source && fieldsOf(source).filter(field => field.status === 'available' && field.locator === command.field!.locator);
    if (!matching || matching.length !== 1 || matching[0]?.status !== 'available' || command.field.offset >= matching[0].byteLength ||
      !dependencies.reader.readField) return { status: 'blocked', reason: 'selection-mismatch' };
    let range;
    try { range = await dependencies.reader.readField(command.suiteId, command.runId, assertionSelection, command.field.locator,
      command.field.offset, MAX_FIELD_BYTES); }
    catch { return { status: 'blocked', reason: 'unavailable' }; }
    if (range.status === 'blocked') return { status: 'blocked', reason: range.reason === 'not-found' ? 'missing-artifact' : 'unavailable' };
    const value = range.value;
    const next = command.field.offset + value.bytes.length;
    if (value.locator !== command.field.locator || value.offset !== command.field.offset || value.byteLength !== matching[0].byteLength ||
      value.bytes.length < 1 || value.bytes.length > MAX_FIELD_BYTES ||
      value.nextOffset !== (next === value.byteLength ? null : next) || next > value.byteLength) {
      return { status: 'blocked', reason: 'corrupt-artifact' };
    }
    const result = { status: 'ready' as const, summary, field: { locator: value.locator, offset: value.offset, byteLength: value.byteLength,
      bytesBase64: Buffer.from(value.bytes).toString('base64'), nextOffset: value.nextOffset } };
    return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
  }
  if (isGradingIssue && grading.kind === 'rubric') {
    const result = { status: 'ready' as const, summary, gradingIssue: {
      caseId: selection.caseId, attempt: selection.attempt, assertionId: assertion.id,
      grading, source: source ? projectSource(source) : { status: 'gap' as const, reason: 'not-captured' as const },
    } };
    return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
  }
  if (isExecutionIssue) {
    const code = source?.toolEvents.some(event => event.outcome === 'error') ? 'tool-error'
      : manifest.state === 'error' ? 'runner-error' : 'incomplete-execution';
    const result = { status: 'ready' as const, summary, executionIssue: {
      caseId: selection.caseId, attempt: selection.attempt, assertionId: assertion.id, state: manifest.state, code,
      source: source ? projectSource(source) : { status: 'gap' as const, reason: 'not-captured' as const },
    } };
    return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
  }
  const failure = {
    caseId: selection.caseId, attempt: selection.attempt, assertionId: assertion.id, kind: assertion.kind,
    actual: clipped(assertion.actual), expected: clipped(assertion.expected),
    diagnostics: assertion.diagnostics.slice(0, MAX_DIAGNOSTICS).map(clipped),
    ...(artifactPath ? { artifactPath } : {}),
    truncated: assertion.actual.length > MAX_TEXT || assertion.expected.length > MAX_TEXT || assertion.diagnostics.length > MAX_DIAGNOSTICS || assertion.diagnostics.some(item => item.length > MAX_TEXT),
    source: source ? projectSource(source) : { status: 'gap' as const, reason: 'not-captured' as const },
    grading,
  };
  const result = { status: 'ready' as const, summary, failure };
  return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
}
