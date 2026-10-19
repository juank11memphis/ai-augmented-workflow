import { LIMITS } from './limits.js';
import type { Attempt, Manifest, RunConfiguration, HistoryIndex } from './contracts.js';
import { validDiagnosticLink, validFailureProvenance } from './failure-provenance.js';
export function logicalId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value);
}
export function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
export function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max; }
export function text(value: unknown): value is string { return typeof value === 'string' && Buffer.byteLength(value) <= LIMITS.textBytes; }
const texts = (v: unknown, max = LIMITS.diagnostics): v is string[] => Array.isArray(v) && v.length <= max && v.every(text);
const ids = (v: unknown, max = LIMITS.cases): v is string[] => Array.isArray(v) && v.length <= max && v.every(logicalId) && new Set(v).size === v.length;
const amount = (v: unknown) => v === null || typeof v === 'number' && Number.isFinite(v) && v >= 0;
const calls = (v: unknown) => v === null || integer(v);
const enumValue = (v: unknown, values: readonly string[]): v is string => typeof v === 'string' && values.includes(v);
const outcome = (v: unknown) => enumValue(v, ['passed', 'failed', 'incomplete']);
const state = (v: unknown): v is string => enumValue(v, ['queued', 'running', 'completed', 'partial', 'blocked', 'error', 'interrupted']);
export const active = (v: string) => v === 'queued' || v === 'running';
function keys(v: Record<string, unknown>, allowed: string) { return Object.keys(v).every(k => allowed.split(' ').includes(k)); }
const configKeys = 'suiteId caseIds scope testedModel judgeModel';
const entryKeys = 'runId suiteId state createdAt updatedAt finishedAt outcome testedModel judgeModel scope calls cost';
export function configuration(v: unknown): v is RunConfiguration & Record<string, unknown> {
  return record(v) && logicalId(v.suiteId) && ids(v.caseIds) && v.caseIds.length > 0 && enumValue(v.scope, ['all', 'selected'])
    && text(v.testedModel) && v.testedModel.length > 0 && (v.judgeModel === null || text(v.judgeModel))
    && (v.caseSelections === undefined || validSelections(v.caseIds, v.caseSelections));
}
function validSelections(caseIds: readonly string[], selections: unknown): boolean {
  return Array.isArray(selections) && selections.length === caseIds.length
    && selections.every((choice, index) => record(choice) && keys(choice, 'caseId testedModel judgeModel')
      && choice.caseId === caseIds[index] && text(choice.testedModel) && choice.testedModel.length > 0
      && (choice.judgeModel === null || text(choice.judgeModel) && choice.judgeModel.length > 0));
}
function entry(v: unknown): boolean {
  return record(v) && logicalId(v.suiteId) && logicalId(v.runId) && state(v.state) && outcome(v.outcome)
    && integer(v.createdAt) && integer(v.updatedAt) && v.updatedAt >= v.createdAt
    && (v.finishedAt === null || integer(v.finishedAt) && v.finishedAt === v.updatedAt)
    && (active(v.state) ? v.finishedAt === null : v.finishedAt !== null)
    && (v.state === 'completed' || v.outcome === 'incomplete')
    && text(v.testedModel) && (v.judgeModel === null || text(v.judgeModel)) && enumValue(v.scope, ['all', 'selected'])
    && calls(v.calls) && amount(v.cost);
}
export function manifest(v: unknown): v is Manifest {
  if (!record(v) || !configuration(v) || !entry(v) || v.version !== 1 || !keys(v, `${configKeys} ${entryKeys} version owner diagnostics cases failureProvenance`)
    || !record(v.owner) || !keys(v.owner, 'pid token') || !integer(v.owner.pid) || v.owner.pid < 1 || !logicalId(v.owner.token)
    || !texts(v.diagnostics) || v.failureProvenance !== undefined && (!validFailureProvenance(v.failureProvenance)
      || v.state === 'queued' || v.state === 'running' || v.state === 'completed')
    || !Array.isArray(v.cases) || v.cases.length !== v.caseIds.length) return false;
  const labeled = v.cases.some(c => record(c) && ('testedModel' in c || 'judgeModel' in c));
  if (labeled && !v.cases.every(c => record(c) && text(c.testedModel) && c.testedModel.length > 0
    && (c.judgeModel === null || text(c.judgeModel) && c.judgeModel.length > 0))) return false;
  return v.cases.every((c, i) => record(c) && keys(c, 'caseId state attempts testedModel judgeModel') && c.caseId === v.caseIds[i]
    && enumValue(c.state, ['not-run', 'incomplete', 'completed']) && Array.isArray(c.attempts) && c.attempts.length <= 1
    && c.attempts.every((a, n) => record(a) && keys(a, 'number outcome durationMs calls cost rubricScores') && a.number === n + 1 && outcome(a.outcome) && integer(a.durationMs) && calls(a.calls) && amount(a.cost)
      && (a.rubricScores === undefined || Array.isArray(a.rubricScores) && a.rubricScores.length <= LIMITS.evidenceItems && a.rubricScores.every(score => typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1)))
    && c.state === (c.attempts.length === 0 ? 'not-run' : c.attempts.length === 1 && c.attempts.every(a => a.outcome !== 'incomplete') ? 'completed' : 'incomplete'))
    && (v.state !== 'queued' || v.cases.every(c => c.attempts.length === 0))
    && validTotals(v)
    && (v.state !== 'completed' || v.cases.every(c => c.state === 'completed') && v.outcome === (v.cases.some(c => c.attempts.some((a: unknown) => record(a) && a.outcome === 'failed')) ? 'failed' : 'passed'));
}
function validTotals(v: Record<string, unknown>): boolean {
  if (!Array.isArray(v.cases)) return false;
  const summaries: Record<string, unknown>[] = [];
  for (const c of v.cases) {
    if (!record(c) || !Array.isArray(c.attempts)) return false;
    for (const a of c.attempts) { if (!record(a)) return false; summaries.push(a); }
  }
  for (const key of ['calls', 'cost']) {
    const expected = summaries.length === 0 || summaries.some(a => a[key] === null) ? null : summaries.reduce((sum, a) => sum + Number(a[key]), 0);
    if (v[key] !== expected) return false;
  }
  return true;
}
export function attempt(v: unknown): v is Attempt {
  if (!record(v)) return false;
  const diagnostics = v.diagnostics;
  if (!record(v) || !keys(v, 'version suiteId runId caseId number outcome durationMs calls cost output truncated diagnostics diagnosticLinks failureProvenance turns tools assertions review sourceCapture') || v.version !== 1
    || ![v.suiteId, v.runId, v.caseId].every(logicalId) || v.number !== 1 || !outcome(v.outcome)
    || !integer(v.durationMs) || !calls(v.calls) || !amount(v.cost) || !text(v.output) || typeof v.truncated !== 'boolean' || !texts(diagnostics)
    || v.diagnosticLinks !== undefined && (!Array.isArray(v.diagnosticLinks) || v.diagnosticLinks.length > LIMITS.diagnostics
      || !v.diagnosticLinks.every(validDiagnosticLink) || !v.diagnosticLinks.every(link => diagnostics.includes(link.code)))
    || v.failureProvenance !== undefined && (!validFailureProvenance(v.failureProvenance) || v.outcome !== 'incomplete')) return false;
  if (v.review !== undefined && (!record(v.review) || !keys(v.review, 'runPath suitePath targetPath runnerPath inputPaths omittedInputPathCount context')
    || v.review.context !== 'current-repo-files' || !reviewPath(v.review.runPath)
    || v.review.targetPath !== null && !reviewPath(v.review.targetPath)
    || v.review.suitePath !== null && !reviewPath(v.review.suitePath)
    || v.review.runnerPath !== null && !reviewPath(v.review.runnerPath)
    || !Array.isArray(v.review.inputPaths) || v.review.inputPaths.length > LIMITS.evidenceItems
    || !v.review.inputPaths.every(reviewPath) || !integer(v.review.omittedInputPathCount))) return false;
  if (v.sourceCapture !== undefined && (!record(v.sourceCapture) || !keys(v.sourceCapture, 'records gaps')
    || !Array.isArray(v.sourceCapture.records) || v.sourceCapture.records.length > LIMITS.evidenceItems
    || !v.sourceCapture.records.every(item => record(item) && keys(item, 'id kind status checkId turnId sequence byteLength')
      && logicalId(item.id) && enumValue(item.kind, ['model-call', 'tool-delivery', 'judge-exchange']) && logicalId(item.checkId)
      && item.status === 'complete' && logicalId(item.turnId) && integer(item.sequence, LIMITS.evidenceItems)
      && integer(item.byteLength, LIMITS.sourceRecordBytes))
    || new Set(v.sourceCapture.records.map(item => item.id)).size !== v.sourceCapture.records.length
    || !v.sourceCapture.records.every((item, index) => item.sequence === index)
    || !Array.isArray(v.sourceCapture.gaps) || v.sourceCapture.gaps.length > LIMITS.evidenceItems
    || !v.sourceCapture.gaps.every(item => record(item) && keys(item, 'reason recordId')
      && enumValue(item.reason, ['incomplete', 'capture-failed']) && (item.recordId === undefined || logicalId(item.recordId))))) return false;
  if (!Array.isArray(v.turns) || v.turns.length > LIMITS.evidenceItems || !v.turns.every(t => record(t) && keys(t, 'id role content') && logicalId(t.id) && enumValue(t.role, ['user', 'assistant', 'system', 'tool']) && text(t.content))
    || !Array.isArray(v.tools) || v.tools.length > LIMITS.evidenceItems || !v.tools.every(t => record(t) && keys(t, 'id name arguments result turnId position outcome') && logicalId(t.id) && text(t.name) && text(t.arguments) && text(t.result)
      && (t.turnId === undefined || logicalId(t.turnId)) && (t.position === undefined || integer(t.position, LIMITS.evidenceItems))
      && (t.outcome === undefined || enumValue(t.outcome, ['result', 'error', 'unexpected-response'])))
    || !Array.isArray(v.assertions) || v.assertions.length > LIMITS.evidenceItems) return false;
  const turns = v.turns.map(t => t.id), tools = v.tools.map(t => t.id);
  if (v.sourceCapture !== undefined) {
    const capture = v.sourceCapture as { records: { id: string; turnId: string; checkId: string }[];
      gaps: { recordId?: string }[] };
    if (capture.gaps.some(gap => gap.recordId !== undefined && capture.records.some(reference => reference.id === gap.recordId))
      || !capture.records.every(item => turns.includes(item.turnId)
      && (v.outcome === 'incomplete' || (v.assertions as { id: string }[]).some(assertion => assertion.id === item.checkId)))) return false;
  }
  return new Set(turns).size === turns.length && new Set(tools).size === tools.length
    && v.tools.every((tool, index) => tool.position === undefined || tool.position === index)
    && v.tools.every(tool => tool.turnId === undefined || turns.includes(tool.turnId))
    && v.assertions.every(a => record(a) && keys(a, 'id kind outcome score threshold expected actual diagnostics turnIds toolIds judgeModel gradingError') && logicalId(a.id)
      && enumValue(a.kind, ['assertion', 'grader']) && outcome(a.outcome) && amount(a.score) && text(a.expected) && text(a.actual) && texts(a.diagnostics)
      && (!('threshold' in a) || typeof a.threshold === 'number' && Number.isFinite(a.threshold))
      && (!('judgeModel' in a) || text(a.judgeModel) && a.judgeModel.length > 0 && a.kind === 'grader'
        && typeof a.threshold === 'number' && a.threshold >= 0 && a.threshold <= 1
        && typeof a.score === 'number' && a.score <= 1
        && a.outcome === (a.score >= a.threshold ? 'passed' : 'failed'))
      && (a.gradingError === undefined || record(a.gradingError) && keys(a.gradingError, 'code')
        && typeof a.gradingError.code === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(a.gradingError.code)
        && a.kind === 'grader' && a.outcome === 'incomplete' && a.score === null)
      && ids(a.turnIds, LIMITS.evidenceItems) && a.turnIds.every(id => turns.includes(id)) && ids(a.toolIds, LIMITS.evidenceItems) && a.toolIds.every(id => tools.includes(id)))
    && new Set(v.assertions.map(a => a.id)).size === v.assertions.length
    && (v.outcome !== 'passed' || v.assertions.length > 0 && v.assertions.every(a => a.outcome === 'passed'));
}
function reviewPath(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 400 && !value.startsWith('/') && !value.includes('\\')
    && !/[\u0000-\u001f\u007f]/.test(value)
    && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}
export function historyIndex(v: unknown): v is HistoryIndex {
  return record(v) && keys(v, 'version entries') && v.version === 1 && Array.isArray(v.entries) && v.entries.length <= LIMITS.history
    && v.entries.every(e => record(e) && keys(e, entryKeys) && entry(e)) && new Set(v.entries.map(e => e.runId)).size === v.entries.length;
}
export function boundedJson(value: unknown, bytes: number): boolean {
  let nodes = 0;
  function walk(v: unknown, depth: number): boolean {
    if (++nodes > LIMITS.nodes || depth > LIMITS.depth) return false;
    if (v === null || typeof v === 'boolean' || typeof v === 'number' && Number.isFinite(v)) return true;
    if (typeof v === 'string') return text(v);
    if (Array.isArray(v)) return v.length <= LIMITS.nodes && v.every(x => walk(x, depth + 1));
    return record(v) && Object.getPrototypeOf(v) === Object.prototype && Object.entries(v).every(([k, x]) => text(k) && !['__proto__', 'constructor', 'prototype'].includes(k) && walk(x, depth + 1));
  }
  try { return walk(value, 0) && Buffer.byteLength(JSON.stringify(value)) <= bytes; } catch { return false; }
}
