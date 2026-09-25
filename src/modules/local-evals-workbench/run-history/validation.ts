import { LIMITS } from './limits.js';
import type { Attempt, Manifest, RunConfiguration, HistoryIndex } from './contracts.js';
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
const configKeys = 'suiteId caseIds scope testedModel judgeModel repeats';
const entryKeys = 'runId suiteId state createdAt updatedAt finishedAt outcome testedModel judgeModel scope repeats calls cost';
export function configuration(v: unknown): v is RunConfiguration & Record<string, unknown> {
  return record(v) && logicalId(v.suiteId) && ids(v.caseIds) && v.caseIds.length > 0 && enumValue(v.scope, ['all', 'selected'])
    && text(v.testedModel) && v.testedModel.length > 0 && (v.judgeModel === null || text(v.judgeModel)) && integer(v.repeats, LIMITS.repeats) && v.repeats > 0;
}
function entry(v: unknown): boolean {
  return record(v) && logicalId(v.suiteId) && logicalId(v.runId) && state(v.state) && outcome(v.outcome)
    && integer(v.createdAt) && integer(v.updatedAt) && v.updatedAt >= v.createdAt
    && (v.finishedAt === null || integer(v.finishedAt) && v.finishedAt === v.updatedAt)
    && (active(v.state) ? v.finishedAt === null : v.finishedAt !== null)
    && (v.state === 'completed' || v.outcome === 'incomplete')
    && text(v.testedModel) && (v.judgeModel === null || text(v.judgeModel)) && enumValue(v.scope, ['all', 'selected'])
    && integer(v.repeats, LIMITS.repeats) && v.repeats > 0 && calls(v.calls) && amount(v.cost);
}
export function manifest(v: unknown): v is Manifest {
  if (!record(v) || !configuration(v) || !entry(v) || v.version !== 1 || !keys(v, `${configKeys} ${entryKeys} version owner diagnostics cases`)
    || !record(v.owner) || !keys(v.owner, 'pid token') || !integer(v.owner.pid) || v.owner.pid < 1 || !logicalId(v.owner.token)
    || !texts(v.diagnostics) || !Array.isArray(v.cases) || v.cases.length !== v.caseIds.length) return false;
  return v.cases.every((c, i) => record(c) && keys(c, 'caseId state attempts') && c.caseId === v.caseIds[i]
    && enumValue(c.state, ['not-run', 'incomplete', 'completed']) && Array.isArray(c.attempts) && c.attempts.length <= v.repeats
    && c.attempts.every((a, n) => record(a) && keys(a, 'number outcome durationMs calls cost') && a.number === n + 1 && outcome(a.outcome) && integer(a.durationMs) && calls(a.calls) && amount(a.cost))
    && c.state === (c.attempts.length === 0 ? 'not-run' : c.attempts.length === v.repeats && c.attempts.every(a => a.outcome !== 'incomplete') ? 'completed' : 'incomplete'))
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
  if (!record(v) || !keys(v, 'version suiteId runId caseId number outcome durationMs calls cost output truncated diagnostics turns tools assertions') || v.version !== 1
    || ![v.suiteId, v.runId, v.caseId].every(logicalId) || !integer(v.number, LIMITS.repeats) || v.number < 1 || !outcome(v.outcome)
    || !integer(v.durationMs) || !calls(v.calls) || !amount(v.cost) || !text(v.output) || typeof v.truncated !== 'boolean' || !texts(v.diagnostics)) return false;
  if (!Array.isArray(v.turns) || v.turns.length > LIMITS.evidenceItems || !v.turns.every(t => record(t) && keys(t, 'id role content') && logicalId(t.id) && enumValue(t.role, ['user', 'assistant', 'system', 'tool']) && text(t.content))
    || !Array.isArray(v.tools) || v.tools.length > LIMITS.evidenceItems || !v.tools.every(t => record(t) && keys(t, 'id name arguments result') && logicalId(t.id) && text(t.name) && text(t.arguments) && text(t.result))
    || !Array.isArray(v.assertions) || v.assertions.length > LIMITS.evidenceItems) return false;
  const turns = v.turns.map(t => t.id), tools = v.tools.map(t => t.id);
  return new Set(turns).size === turns.length && new Set(tools).size === tools.length
    && v.assertions.every(a => record(a) && keys(a, 'id kind outcome score threshold expected actual diagnostics turnIds toolIds') && logicalId(a.id)
      && enumValue(a.kind, ['assertion', 'grader']) && outcome(a.outcome) && amount(a.score) && text(a.expected) && text(a.actual) && texts(a.diagnostics)
      && (!('threshold' in a) || typeof a.threshold === 'number' && Number.isFinite(a.threshold))
      && ids(a.turnIds, LIMITS.evidenceItems) && a.turnIds.every(id => turns.includes(id)) && ids(a.toolIds, LIMITS.evidenceItems) && a.toolIds.every(id => tools.includes(id)))
    && new Set(v.assertions.map(a => a.id)).size === v.assertions.length
    && (v.outcome !== 'passed' || v.assertions.length > 0 && v.assertions.every(a => a.outcome === 'passed'));
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
