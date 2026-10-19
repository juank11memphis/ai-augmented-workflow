export type RunState = 'queued' | 'running' | 'completed' | 'partial' | 'blocked' | 'error' | 'interrupted';
export type CheckOutcome = 'passed' | 'failed' | 'incomplete';
export type FailureProvenance = {
  readonly stage: 'runner-report' | 'unexpected-process-exit' | 'timeout' | 'protocol-rejection';
  readonly runnerReport?: { readonly status: 'error' | 'interrupted'; readonly code?: string };
  readonly processExit?: { readonly code: number | null };
};
export type DiagnosticLink = { readonly code: string; readonly turnId?: string; readonly callId?: string };
export type Reason = 'invalid-input' | 'unsafe-path' | 'not-ignored' | 'tracked-artifacts' | 'git-unavailable' | 'unverifiable-root' | 'unavailable' | 'not-found' | 'corrupt' | 'limit-exceeded' | 'invalid-transition' | 'owner-unknown' | 'index-stale';
export type Failure = { readonly status: 'blocked'; readonly reason: Reason };
export type Outcome<T> = { readonly status: 'ok'; readonly value: T; readonly warnings?: readonly Reason[] } | Failure;
export type Owner = { readonly pid: number; readonly token: string };
export type Liveness = 'live' | 'stopped' | 'unknown';
export interface OwnerPort { readonly identity: Owner; check(owner: Owner): Promise<Liveness> }
export type RunConfiguration = {
  readonly suiteId: string; readonly caseIds: readonly string[]; readonly scope: 'all' | 'selected';
  readonly testedModel: string; readonly judgeModel: string | null;
  readonly caseSelections?: readonly CaseModelSelection[];
};
export type CaseModelSelection = { readonly caseId: string; readonly testedModel: string; readonly judgeModel: string | null };
export type AttemptSummary = { readonly number: number; readonly outcome: CheckOutcome; readonly durationMs: number; readonly calls: number | null; readonly cost: number | null;
  readonly rubricScores?: readonly number[] };
export type CaseSummary = { readonly caseId: string; readonly state: 'not-run' | 'incomplete' | 'completed'; readonly attempts: readonly AttemptSummary[];
  readonly testedModel?: string; readonly judgeModel?: string | null };
export type Manifest = Omit<RunConfiguration, 'caseSelections'> & {
  readonly version: 1; readonly runId: string; readonly state: RunState; readonly owner: Owner;
  readonly createdAt: number; readonly updatedAt: number; readonly finishedAt: number | null;
  readonly outcome: CheckOutcome; readonly calls: number | null; readonly cost: number | null;
  readonly diagnostics: readonly string[]; readonly cases: readonly CaseSummary[];
  readonly failureProvenance?: FailureProvenance;
};
export type AssertionEvidence = {
  readonly id: string; readonly kind: 'assertion' | 'grader'; readonly outcome: CheckOutcome;
  readonly score: number | null; readonly threshold?: number; readonly expected: string; readonly actual: string;
  readonly diagnostics: readonly string[]; readonly turnIds: readonly string[]; readonly toolIds: readonly string[];
  readonly judgeModel?: string;
  readonly gradingError?: { readonly code: string };
};
export type EvidenceGap = 'not-captured' | 'incomplete' | 'redacted' | 'capture-failed';
export type EvidenceField =
  | { readonly status: 'available'; readonly locator: string; readonly byteLength: number; readonly value?: string }
  | { readonly status: 'gap'; readonly reason: EvidenceGap };
export type ModelCallEvidence = {
  readonly id: string; readonly turnId: string; readonly sequence: number; readonly modelId: string;
  readonly inputMessages: readonly { readonly role: 'system' | 'user' | 'assistant' | 'tool'; readonly content: EvidenceField }[];
  readonly rawText: EvidenceField;
  readonly rawToolCalls: readonly { readonly id: string; readonly name: string; readonly arguments: EvidenceField }[];
  readonly normalizedOutput: EvidenceField;
};
export type DeliveredToolEvidence = {
  readonly id: string; readonly modelCallId: string; readonly sequence: number; readonly name: string;
  readonly request: EvidenceField; readonly result: EvidenceField;
  readonly outcome: 'result' | 'error' | 'unexpected-response';
};
export type SourceEvidence = {
  readonly version: 2; readonly assertionId: string;
  readonly modelCalls: readonly ModelCallEvidence[]; readonly toolEvents: readonly DeliveredToolEvidence[];
  readonly approvedFacts: readonly { readonly modelCallId: string; readonly factId: string; readonly provenance: string }[];
  readonly judge?: JudgeExchangeEvidence;
  readonly gaps?: readonly { readonly reason: 'incomplete' | 'capture-failed'; readonly recordId?: string }[];
};
export type JudgeExchangeEvidence = {
  readonly version: 1; readonly judgeModel: string;
  readonly evaluatedRubric: EvidenceField;
  readonly request: EvidenceField; readonly response: EvidenceField; readonly rationale: EvidenceField;
  readonly error?: { readonly code: string };
};
export type EvidenceFieldRange = {
  readonly locator: string; readonly offset: number; readonly byteLength: number;
  readonly bytes: Uint8Array; readonly nextOffset: number | null;
};
export type SourceReference = { readonly id: string; readonly kind: 'model-call' | 'tool-delivery' | 'judge-exchange'; readonly status: 'complete';
  readonly checkId: string; readonly turnId: string; readonly sequence: number; readonly byteLength: number };
export type SourceCapture = { readonly records: readonly SourceReference[];
  readonly gaps: readonly { readonly reason: 'incomplete' | 'capture-failed'; readonly recordId?: string }[] };
export type StoredSourceRecord = { readonly version: 1; readonly suiteId: string; readonly runId: string;
  readonly caseId: string; readonly attempt: number; readonly sequence: number; readonly status: 'complete'; readonly byteLength: number;
  readonly record: import('../run-execution/contracts.js').SourceRecord };
export type SourceRecordWrite = Omit<StoredSourceRecord, 'status' | 'byteLength'>;
export type ProviderResponseWrite = { readonly suiteId: string; readonly runId: string; readonly caseId: string;
  readonly attempt: number; readonly callId: string; readonly provisionalTurnId: string;
  readonly bytes: Uint8Array; readonly contentType?: string; readonly originalByteLength?: number;
  readonly completeness: 'complete' | 'truncated' | 'incomplete' };
export type ProviderResponseReference = { readonly callId: string; readonly provisionalTurnId: string;
  readonly status: 'complete' | 'truncated' | 'incomplete'; readonly locator: string;
  readonly byteLength: number; readonly contentType?: string; readonly originalByteLength?: number };
export type ProviderResponseGap = { readonly callId: string; readonly provisionalTurnId: string;
  readonly reason: 'not-observed' | 'not-emitted' | 'capture-failed' | 'incomplete' };
export type ProviderResponseCapture = { readonly records: readonly ProviderResponseReference[];
  readonly gaps: readonly ProviderResponseGap[] };
export type TurnEvidence = { readonly id: string; readonly role: 'user' | 'assistant' | 'system' | 'tool'; readonly content: string };
export type ToolEvidence = { readonly id: string; readonly name: string; readonly arguments: string; readonly result: string;
  readonly turnId?: string; readonly position?: number; readonly outcome?: 'result' | 'error' | 'unexpected-response' };
export type Attempt = {
  readonly version: 1; readonly suiteId: string; readonly runId: string; readonly caseId: string;
  readonly number: number; readonly outcome: CheckOutcome; readonly durationMs: number;
  readonly calls: number | null; readonly cost: number | null; readonly output: string;
  readonly truncated: boolean; readonly diagnostics: readonly string[]; readonly diagnosticLinks?: readonly DiagnosticLink[];
  readonly failureProvenance?: FailureProvenance; readonly turns: readonly TurnEvidence[];
  readonly tools: readonly ToolEvidence[]; readonly assertions: readonly AssertionEvidence[];
  readonly sourceEvidence?: SourceEvidence;
  readonly sourceCapture?: SourceCapture;
  /** Absent on legacy attempts; never infer a response from that absence. */
  readonly providerResponses?: ProviderResponseCapture;
  /** Repo-relative sources for a repo-aware reviewer; saved outputs and check results are above. */
  readonly review?: { readonly runPath: string; readonly suitePath: string | null; readonly targetPath: string | null; readonly runnerPath: string | null;
    readonly inputPaths: readonly string[]; readonly omittedInputPathCount: number; readonly context: 'current-repo-files' };
};
export type HistoryEntry = Pick<Manifest, 'runId' | 'suiteId' | 'state' | 'createdAt' | 'updatedAt' | 'finishedAt' | 'outcome' | 'testedModel' | 'judgeModel' | 'scope' | 'calls' | 'cost'>;
export type HistoryIndex = { readonly version: 1; readonly entries: readonly HistoryEntry[] };
export type Selection = { readonly caseId: string; readonly attempt: number; readonly assertionId?: string };
export type RunDetail = { readonly summary: Manifest; readonly evidence?: Attempt; readonly evidenceStatus: 'not-requested' | 'available' | 'unavailable';
  readonly reviewArtifactPath?: string };
export interface ArtifactSafetyPort { check(relativePaths?: readonly string[]): Promise<Outcome<null>> }
export interface ArtifactReaderPort {
  list(suiteId: string, limit: number): Promise<Outcome<readonly HistoryEntry[]>>;
  get(suiteId: string, runId: string, selection?: Selection): Promise<Outcome<RunDetail>>;
  sourceRecord?(suiteId: string, runId: string, selection: Required<Selection>, recordId: string): Promise<Outcome<StoredSourceRecord>>;
  sourceFieldRange?(suiteId: string, runId: string, selection: Required<Selection>, locator: string, offset: number): Promise<Outcome<EvidenceFieldRange>>;
  providerResponseRange?(suiteId: string, runId: string, selection: Selection, locator: string, offset: number, limit?: number): Promise<Outcome<EvidenceFieldRange>>;
}
export interface ArtifactStorePort {
  create(configuration: RunConfiguration): Promise<Outcome<Manifest>>;
  start(suiteId: string, runId: string): Promise<Outcome<Manifest>>;
  append(suiteId: string, runId: string, attempt: Attempt): Promise<Outcome<Manifest>>;
  saveSourceRecord?(record: SourceRecordWrite): Promise<Outcome<SourceReference>>;
  saveProviderResponse?(response: ProviderResponseWrite): Promise<Outcome<ProviderResponseReference>>;
  finalize(suiteId: string, runId: string, state: Exclude<RunState, 'queued' | 'running'>, diagnostics?: readonly string[], failureProvenance?: FailureProvenance): Promise<Outcome<Manifest>>;
}
export type ArtifactEvent = { readonly event: 'artifact-persisted' | 'artifact-blocked' | 'artifact-recovered' | 'artifact-read'; readonly reason?: Reason; readonly state?: RunState; readonly count?: number };
export interface ArtifactLogger { emit(event: ArtifactEvent): void }
