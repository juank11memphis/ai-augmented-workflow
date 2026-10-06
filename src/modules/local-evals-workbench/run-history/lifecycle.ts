import type { Attempt, Manifest, Outcome, RunState } from './contracts.js';
import { active, manifest } from './validation.js';
export function transition(run: Manifest, state: RunState, now: number, diagnostics: readonly string[] = run.diagnostics): Outcome<Manifest> {
  if (!active(run.state) || state === 'queued' || state === 'running' && run.state !== 'queued' || now < run.updatedAt) return { status: 'blocked', reason: 'invalid-transition' };
  const value: Manifest = { ...run, state, updatedAt: now, finishedAt: active(state) ? null : now, diagnostics,
    outcome: state === 'completed' ? run.cases.some(c => c.attempts.some(a => a.outcome === 'failed')) ? 'failed' : 'passed' : 'incomplete' };
  return manifest(value) ? { status: 'ok', value } : { status: 'blocked', reason: 'invalid-transition' };
}
export function appendAttempt(run: Manifest, evidence: Attempt, now: number): Outcome<Manifest> {
  const selected = run.cases.find(c => c.caseId === evidence.caseId);
  const replacingIncomplete = selected?.attempts.at(-1)?.outcome === 'incomplete' && evidence.number === selected.attempts.length;
  if (run.state !== 'running' || now < run.updatedAt || evidence.runId !== run.runId || evidence.suiteId !== run.suiteId || !selected || !(evidence.number === selected.attempts.length + 1 || replacingIncomplete) || evidence.number !== 1) return { status: 'blocked', reason: 'invalid-transition' };
  const { number, outcome, durationMs, calls, cost } = evidence;
  const rubricScores = evidence.assertions.filter(item => item.judgeModel !== undefined && item.score !== null).map(item => item.score!);
  const attempts = [...(replacingIncomplete ? selected.attempts.slice(0, -1) : selected.attempts), { number, outcome, durationMs, calls, cost, rubricScores }];
  const cases = run.cases.map(c => c !== selected ? c : { ...c, attempts, state: attempts.length === 1 && attempts.every(a => a.outcome !== 'incomplete') ? 'completed' as const : 'incomplete' as const });
  const all = cases.flatMap(c => c.attempts);
  return { status: 'ok', value: { ...run, cases, updatedAt: now,
    calls: all.some(a => a.calls === null) ? null : all.reduce((n, a) => n + (a.calls ?? 0), 0),
    cost: all.some(a => a.cost === null) ? null : all.reduce((n, a) => n + (a.cost ?? 0), 0) } };
}
