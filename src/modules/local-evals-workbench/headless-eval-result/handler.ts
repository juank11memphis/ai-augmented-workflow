import type { HeadlessEvalResultCommand } from './command.js';
import type { HeadlessEvalResultDependencies } from './ports.js';
import type { HeadlessEvalResult, HeadlessEvalSummary } from './result.js';
import { failedAssertionLocators } from '../run-history/failed-assertion-locators.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_TEXT = 600;
const MAX_DIAGNOSTICS = 3;
const MAX_JSON = 4800;

function safeArtifactPath(path: string | undefined): string | undefined {
  return path && /^(?!.*(?:^|\/)\.\.?\/)[A-Za-z0-9._/-]+$/.test(path) && !path.startsWith('/') ? path : undefined;
}

function clipped(value: string): string {
  return value.length <= MAX_TEXT ? value : `${value.slice(0, MAX_TEXT - 1)}…`;
}

export async function headlessEvalResult(command: HeadlessEvalResultCommand, dependencies: HeadlessEvalResultDependencies): Promise<HeadlessEvalResult> {
  const { selection } = command;
  if (!ID.test(command.suiteId) || !ID.test(command.runId) ||
    selection && (!ID.test(selection.caseId) || selection.attempt !== 1 || !ID.test(selection.assertionId))) {
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
  const summary: HeadlessEvalSummary = {
    suiteId: manifest.suiteId, runId: manifest.runId, state: manifest.state, outcome: manifest.outcome,
    scope: manifest.scope, testedModel: manifest.testedModel, judgeModel: manifest.judgeModel,
    cases: selection ? manifest.cases.map(item => ({ caseId: item.caseId, state: item.state,
      testedModel: item.testedModel ?? manifest.testedModel, judgeModel: item.judgeModel !== undefined ? item.judgeModel : manifest.judgeModel,
      attempts: item.attempts.map(attempt => ({ number: attempt.number, outcome: attempt.outcome })) }))
      : await failedAssertionLocators(manifest, dependencies.reader),
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
  const assertion = evidence.assertions.find(item => item.id === selection.assertionId);
  if (!assertion || evidence.assertions.length !== 1) return { status: 'blocked', reason: 'selection-mismatch' };
  if (evidence.outcome !== 'failed' || assertion.outcome !== 'failed') return { status: 'blocked', reason: 'non-failed-assertion' };
  const failure = {
    caseId: selection.caseId, attempt: selection.attempt, assertionId: assertion.id, kind: assertion.kind,
    actual: clipped(assertion.actual), expected: clipped(assertion.expected),
    diagnostics: assertion.diagnostics.slice(0, MAX_DIAGNOSTICS).map(clipped),
    ...(artifactPath ? { artifactPath } : {}),
    truncated: assertion.actual.length > MAX_TEXT || assertion.expected.length > MAX_TEXT || assertion.diagnostics.length > MAX_DIAGNOSTICS || assertion.diagnostics.some(item => item.length > MAX_TEXT),
  };
  const result = { status: 'ready' as const, summary, failure };
  return JSON.stringify(result).length <= MAX_JSON ? result : { status: 'blocked', reason: 'unavailable' };
}
