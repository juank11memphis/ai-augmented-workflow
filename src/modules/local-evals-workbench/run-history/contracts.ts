export type RunState = 'queued' | 'running' | 'completed' | 'partial' | 'blocked' | 'error' | 'interrupted';
export type CheckOutcome = 'passed' | 'failed' | 'incomplete';
export type Reason = 'invalid-input' | 'unsafe-path' | 'not-ignored' | 'tracked-artifacts' | 'git-unavailable' | 'unverifiable-root' | 'unavailable' | 'not-found' | 'corrupt' | 'limit-exceeded' | 'invalid-transition' | 'owner-unknown' | 'index-stale';
export type Failure = { readonly status: 'blocked'; readonly reason: Reason };
export type Outcome<T> = { readonly status: 'ok'; readonly value: T; readonly warnings?: readonly Reason[] } | Failure;
export type Owner = { readonly pid: number; readonly token: string };
export type Liveness = 'live' | 'stopped' | 'unknown';
export interface OwnerPort { readonly identity: Owner; check(owner: Owner): Promise<Liveness> }
export type RunConfiguration = {
  readonly suiteId: string; readonly caseIds: readonly string[]; readonly scope: 'all' | 'selected';
  readonly testedModel: string; readonly judgeModel: string | null; readonly repeats: number;
};
export type AttemptSummary = { readonly number: number; readonly outcome: CheckOutcome; readonly durationMs: number; readonly calls: number | null; readonly cost: number | null };
export type CaseSummary = { readonly caseId: string; readonly state: 'not-run' | 'incomplete' | 'completed'; readonly attempts: readonly AttemptSummary[] };
export type Manifest = RunConfiguration & {
  readonly version: 1; readonly runId: string; readonly state: RunState; readonly owner: Owner;
  readonly createdAt: number; readonly updatedAt: number; readonly finishedAt: number | null;
  readonly outcome: CheckOutcome; readonly calls: number | null; readonly cost: number | null;
  readonly diagnostics: readonly string[]; readonly cases: readonly CaseSummary[];
};
export type AssertionEvidence = {
  readonly id: string; readonly kind: 'assertion' | 'grader'; readonly outcome: CheckOutcome;
  readonly score: number | null; readonly threshold?: number; readonly expected: string; readonly actual: string;
  readonly diagnostics: readonly string[]; readonly turnIds: readonly string[]; readonly toolIds: readonly string[];
};
export type TurnEvidence = { readonly id: string; readonly role: 'user' | 'assistant' | 'system' | 'tool'; readonly content: string };
export type ToolEvidence = { readonly id: string; readonly name: string; readonly arguments: string; readonly result: string };
export type Attempt = {
  readonly version: 1; readonly suiteId: string; readonly runId: string; readonly caseId: string;
  readonly number: number; readonly outcome: CheckOutcome; readonly durationMs: number;
  readonly calls: number | null; readonly cost: number | null; readonly output: string;
  readonly truncated: boolean; readonly diagnostics: readonly string[]; readonly turns: readonly TurnEvidence[];
  readonly tools: readonly ToolEvidence[]; readonly assertions: readonly AssertionEvidence[];
};
export type HistoryEntry = Pick<Manifest, 'runId' | 'suiteId' | 'state' | 'createdAt' | 'updatedAt' | 'finishedAt' | 'outcome' | 'testedModel' | 'judgeModel' | 'scope' | 'repeats' | 'calls' | 'cost'>;
export type HistoryIndex = { readonly version: 1; readonly entries: readonly HistoryEntry[] };
export type Selection = { readonly caseId: string; readonly attempt: number; readonly assertionId?: string };
export type RunDetail = { readonly summary: Manifest; readonly evidence?: Attempt; readonly evidenceStatus: 'not-requested' | 'available' | 'unavailable' };
export interface ArtifactSafetyPort { check(relativePaths?: readonly string[]): Promise<Outcome<null>> }
export interface ArtifactReaderPort {
  list(suiteId: string, limit: number): Promise<Outcome<readonly HistoryEntry[]>>;
  get(suiteId: string, runId: string, selection?: Selection): Promise<Outcome<RunDetail>>;
}
export interface ArtifactStorePort {
  create(configuration: RunConfiguration): Promise<Outcome<Manifest>>;
  start(suiteId: string, runId: string): Promise<Outcome<Manifest>>;
  append(suiteId: string, runId: string, attempt: Attempt): Promise<Outcome<Manifest>>;
  finalize(suiteId: string, runId: string, state: Exclude<RunState, 'queued' | 'running'>, diagnostics?: readonly string[]): Promise<Outcome<Manifest>>;
}
export type ArtifactEvent = { readonly event: 'artifact-persisted' | 'artifact-blocked' | 'artifact-recovered' | 'artifact-read'; readonly reason?: Reason; readonly state?: RunState; readonly count?: number };
export interface ArtifactLogger { emit(event: ArtifactEvent): void }
