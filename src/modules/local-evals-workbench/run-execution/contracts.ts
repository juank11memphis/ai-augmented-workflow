import type { NormalizedEvalSuite, NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { FailureProvenance } from '../run-history/contracts.js';

export type OrderedRunPlanChoice = { readonly caseId: string; readonly testedModel: string; readonly judgeModel: string | null };
export type OrderedRunPlan = readonly OrderedRunPlanChoice[];

/** Reject incomplete or reordered selections before a logical run is created. */
export function orderedRunPlan(caseIds: readonly string[], selections: readonly OrderedRunPlanChoice[]): OrderedRunPlan | undefined {
  if (caseIds.length === 0 || selections.length !== caseIds.length || new Set(caseIds).size !== caseIds.length) return undefined;
  if (!selections.every((choice, index) => choice.caseId === caseIds[index]
    && typeof choice.testedModel === 'string' && choice.testedModel.length > 0
    && (choice.judgeModel === null || typeof choice.judgeModel === 'string' && choice.judgeModel.length > 0))) return undefined;
  return Object.freeze(selections.map(choice => Object.freeze({ ...choice })));
}

export type ExecutionSelection = {
  readonly runId: string;
  readonly suite: NormalizedEvalSuite;
  readonly cases: readonly NormalizedEvalTestCase[];
  readonly model: string;
  readonly judgeModel?: string | null;
  readonly caseSelections?: OrderedRunPlan;
  readonly suitePath?: string;
  /** Accepted request reference propagated from the queued start, never persisted. */
  readonly reference?: string;
};
export type ExecutionEvent = SourceExecutionEvent
  | { readonly type: 'provider-response-observed'; readonly caseId: string; readonly attempt: number;
      readonly callId: string; readonly provisionalTurnId: string; readonly role?: 'tested-model' | 'judge'; readonly checkId?: string; readonly bytes: Uint8Array;
      readonly contentType?: string; readonly originalByteLength?: number; readonly completeness: 'complete' | 'truncated' | 'incomplete' }
  | { readonly type: 'provider-response-gap'; readonly caseId: string; readonly attempt: number;
      readonly callId: string; readonly provisionalTurnId: string; readonly role?: 'tested-model' | 'judge'; readonly checkId?: string;
      readonly reason: 'not-observed' | 'not-emitted' | 'capture-failed' | 'incomplete' }
  | { readonly type: 'run-started' }
  | { readonly type: 'case-started'; readonly caseId: string; readonly attempt?: number }
  | { readonly type: 'turn-completed'; readonly caseId: string; readonly attempt?: number; readonly turnId: string; readonly turnIndex?: number; readonly output: string }
  | { readonly type: 'tool-recorded'; readonly caseId: string; readonly attempt: number; readonly toolId: string; readonly turnId: string; readonly position: number; readonly name: string; readonly arguments: string; readonly outcome: 'result' | 'error' | 'unexpected-response'; readonly result: string }
  | { readonly type: 'grader-completed'; readonly caseId: string; readonly attempt: number; readonly checkId: string; readonly grader: 'custom' | 'rubric'; readonly passed: boolean; readonly score: number | null; readonly threshold?: number; readonly judgeModel?: string; readonly evidence: string; readonly diagnostics: readonly string[]; readonly sequence?: number }
  | { readonly type: 'grading-error'; readonly caseId: string; readonly attempt: number; readonly checkId: string; readonly judgeModel: string; readonly code: string; readonly sequence: number }
  | { readonly type: 'case-completed'; readonly caseId: string; readonly attempt?: number; readonly status: 'completed' | 'error'; readonly calls?: number | null; readonly cost?: number | null; readonly sourceCapture?: 'complete' | 'not-captured' | 'incomplete' }
  | { readonly type: 'run-completed'; readonly status: 'completed' | 'error' | 'interrupted'; readonly code?: string }
  | { readonly type: 'diagnostic'; readonly code: string; readonly caseId: string | null; readonly attempt?: number | null;
      readonly turnId?: string; readonly callId?: string };
export type SourceRecord =
  | { readonly kind: 'model-call'; readonly id: string; readonly turnId: string; readonly checkId: string;
      readonly modelId: string; readonly phase: 'initial' | 'post-tool'; readonly elapsedMs: number;
      readonly inputMessages: readonly { readonly role: 'system' | 'user' | 'assistant' | 'tool'; readonly content: string }[];
      readonly rawText: string; readonly rawToolCalls: readonly { readonly id: string; readonly name: string; readonly arguments: unknown }[];
      readonly normalizedOutput: string; readonly approvedFacts?: readonly { readonly factId: string; readonly provenance: string }[];
      readonly redactedFields?: readonly ('inputMessages' | 'rawText' | 'rawToolCalls' | 'normalizedOutput')[] }
  | { readonly kind: 'tool-delivery'; readonly id: string; readonly turnId: string; readonly checkId: string;
      readonly modelCallId: string; readonly name: string; readonly request: unknown; readonly result: unknown;
      readonly outcome: 'result' | 'error' | 'unexpected-response'; readonly elapsedMs: number;
      readonly redactedFields?: readonly ('request' | 'result')[] }
  | { readonly kind: 'judge-exchange'; readonly id: string; readonly turnId: string; readonly checkId: string;
      readonly judgeModel: string; readonly eventSequence: number; readonly elapsedMs: number;
      readonly evaluatedRubric: string; readonly request: string; readonly response?: string; readonly rationale?: string;
      readonly redactedFields?: readonly ('evaluatedRubric' | 'request' | 'response' | 'rationale')[];
      readonly result: { readonly status: 'completed'; readonly score: number; readonly threshold: number; readonly passed: boolean }
        | { readonly status: 'grading-error'; readonly code: string } };
export type SourceExecutionEvent =
  | { readonly type: 'source-chunk-accepted' }
  | { readonly type: 'source-record'; readonly caseId: string; readonly attempt: number; readonly sequence: number; readonly record: SourceRecord }
  | { readonly type: 'source-gap'; readonly caseId: string; readonly attempt: number; readonly reason: 'incomplete' | 'capture-failed'; readonly recordId?: string };
export type RunnerExecutionOutcome = { readonly status: 'completed' | 'error' | 'interrupted' | 'blocked'; readonly reason?: string;
  readonly failureProvenance?: FailureProvenance };
