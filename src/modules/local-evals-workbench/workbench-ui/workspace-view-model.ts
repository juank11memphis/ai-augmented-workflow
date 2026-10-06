import type { EvalSuiteDiscoveryResult, EvalSuiteSummary } from '../discover-conventional-eval-suites/result.js';
import type { Manifest, HistoryEntry } from '../run-history/contracts.js';

export type WorkspaceState = 'empty' | 'ready' | 'queued' | 'running' | 'completed' | 'partial' | 'blocked' | 'interrupted' | 'error';
export type WorkspaceCaseStatus = 'excluded' | 'not-run' | 'incomplete' | 'running' | 'passed' | 'failed';
export type WorkspaceCase = { readonly id: string; readonly name: string; readonly status: WorkspaceCaseStatus; readonly failedChecks: number; readonly checkCount: number; readonly attempts: number };
export type DiscoveryNotice = { readonly title: string; readonly explanation: string; readonly nextStep: string };
export function discoveryNotice(discovery: EvalSuiteDiscoveryResult): DiscoveryNotice | null {
  if (discovery.status !== 'blocked') return null;
  switch (discovery.reason) {
    case 'missing-evals-folder': return { title: 'No eval suites found', explanation: 'Sibu could not find an evals folder.', nextStep: 'Add an eval suite under evals/.' };
    case 'no-eval-suites': return { title: 'No eval suites found', explanation: 'Sibu found no usable eval suites.', nextStep: 'Add an eval suite under evals/.' };
    case 'unreadable-eval-suites': return { title: "Sibu couldn't read the eval suites", explanation: 'Suite definitions could not be used.', nextStep: 'Check the local eval workspace and correct the suites.' };
    case 'discovery-failed': return { title: 'Eval suite discovery failed', explanation: 'Sibu could not finish reading suites. Cause unknown.', nextStep: 'Check project access, then try again.' };
  }
}
export type WorkspaceViewModel = {
  readonly suite: EvalSuiteSummary | null;
  readonly state: WorkspaceState;
  readonly statusText: string;
  readonly cases: readonly WorkspaceCase[];
  readonly passed: number;
  readonly failed: number;
  readonly unfinished: number;
  readonly excluded: number;
  readonly progress: string;
  readonly durationMs: number | null;
  readonly cost: number | null;
  readonly run: Manifest | null;
  readonly historical: boolean;
  readonly history: readonly HistoryEntry[];
  readonly discoveryNotice: DiscoveryNotice | null;
};

export function createWorkspaceViewModel(input: {
  readonly discovery: EvalSuiteDiscoveryResult;
  readonly suiteId?: string;
  readonly run?: Manifest | null;
  readonly history?: readonly HistoryEntry[];
}): WorkspaceViewModel {
  const suite = input.discovery.suites.find(item => item.id === input.suiteId) ?? input.discovery.suites[0] ?? null;
  const run = suite && input.run?.suiteId === suite.id ? input.run : null;
  const history = (input.history ?? []).filter(item => item.suiteId === suite?.id).slice(0, 50);
  const latestId = history[0]?.runId;
  const historical = Boolean(run && latestId && run.runId !== latestId);
  const state = !suite ? 'empty' : run?.state ?? 'ready';
  const selectedIds = run?.caseIds ?? suite?.testCases.map(item => item.id) ?? [];
  const caseIds = run ? [...selectedIds, ...suite!.testCases.map(item => item.id).filter(id => !selectedIds.includes(id))] : selectedIds;
  const cases = caseIds.map(id => {
    const item = suite?.testCases.find(candidate => candidate.id === id);
    const selected = selectedIds.includes(id);
    const record = selected ? run?.cases.find(candidate => candidate.caseId === id) : undefined;
    const failedChecks = record?.attempts.filter(attempt => attempt.outcome === 'failed').length ?? 0;
    const status: WorkspaceCaseStatus = run && !selected ? 'excluded'
      : !record || record.state === 'not-run' ? 'not-run'
      : record.state === 'incomplete' ? run?.state === 'running' ? 'running' : 'incomplete'
      : failedChecks > 0 ? 'failed' : record.attempts.length === 0 || record.attempts.some(attempt => attempt.outcome !== 'passed') ? 'incomplete' : 'passed';
    return { id, name: item?.name ?? id, status, failedChecks, checkCount: record?.attempts.length ?? 0, attempts: record?.attempts.length ?? 0 };
  });
  const passed = cases.filter(item => item.status === 'passed').length;
  const failed = cases.filter(item => item.status === 'failed').length;
  const excluded = cases.filter(item => item.status === 'excluded').length;
  const unfinished = selectedIds.length - passed - failed;
  const total = selectedIds.length;
  const completed = total - unfinished;
  const durationMs = run?.finishedAt == null ? null : Math.max(0, run.finishedAt - run.createdAt);
  return { suite, state, run, cases, passed, failed, unfinished, excluded, historical, history, discoveryNotice: discoveryNotice(input.discovery),
    durationMs, cost: run?.cost ?? null,
    progress: `${completed}/${total} complete`,
    statusText: state === 'ready' ? `${cases.length} test cases ready` : state === 'empty' ? 'No eval suites yet'
      : `${state} · ${passed} passed · ${failed} failed · ${unfinished} not finished${excluded ? ` · ${excluded} excluded` : ''}`,
  };
}
