import type { CheckOutcome, RunState } from '../run-history/index.js';
import type { LocatedAttempt } from '../run-history/failed-assertion-locators.js';
import type { DiagnosticLink, EvidenceGap, FailureProvenance, ProviderResponseGap } from '../run-history/contracts.js';

export type SelectedProviderResponses = { readonly status: 'available'; readonly records: readonly {
  readonly callId: string; readonly provisionalTurnId: string; readonly locator: string;
  readonly role?: 'tested-model' | 'judge'; readonly checkId?: string;
  readonly status: 'complete' | 'truncated' | 'incomplete'; readonly byteLength: number;
  readonly originalByteLength?: number; readonly missingByteLength?: number; readonly contentType?: string;
}[]; readonly gaps: readonly ProviderResponseGap[]; readonly truncated: boolean };

export type SelectedEvidenceField =
  | { readonly status: 'available'; readonly locator: string; readonly byteLength: number; readonly truncated: boolean; readonly value?: string }
  | { readonly status: 'gap'; readonly reason: EvidenceGap };
export type SelectedGrading =
  | { readonly kind: 'deterministic' }
  | { readonly kind: 'rubric'; readonly evaluatedRubric: SelectedEvidenceField;
      readonly score: number | null; readonly threshold: number | null;
      readonly comparison: 'passed' | 'failed' | 'incomplete'; readonly judgeModel: string | null;
      readonly error?: { readonly code: string };
      readonly judge: { readonly version: 1; readonly request: SelectedEvidenceField;
        readonly response: SelectedEvidenceField; readonly rationale: SelectedEvidenceField;
        readonly error?: { readonly code: string } } | { readonly status: 'gap'; readonly reason: EvidenceGap } };
export type SelectedSourceEvidence = {
  readonly version: 2;
  readonly sequence: readonly { readonly kind: 'model-call' | 'tool-delivery' | 'judge-exchange';
    readonly id: string; readonly order?: number }[];
  readonly modelCalls: readonly { readonly id: string; readonly turnId: string; readonly sequence: number; readonly modelId: string;
    readonly inputMessages: readonly { readonly role: 'system' | 'user' | 'assistant' | 'tool'; readonly content: SelectedEvidenceField }[];
    readonly rawText: SelectedEvidenceField;
    readonly rawToolCalls: readonly { readonly id: string; readonly name: string; readonly arguments: SelectedEvidenceField }[];
    readonly normalizedOutput: SelectedEvidenceField }[];
  readonly toolEvents: readonly { readonly id: string; readonly modelCallId: string; readonly sequence: number; readonly name: string;
    readonly request: SelectedEvidenceField; readonly result: SelectedEvidenceField;
    readonly outcome: 'result' | 'error' | 'unexpected-response' }[];
  readonly approvedFacts: readonly { readonly modelCallId: string; readonly factId: string; readonly provenance: string }[];
  readonly gaps?: readonly { readonly reason: 'incomplete' | 'capture-failed'; readonly recordId?: string }[];
};

export type HeadlessEvalSummary = {
  readonly suiteId: string;
  readonly runId: string;
  readonly state: RunState;
  readonly outcome: CheckOutcome;
  readonly scope: 'all' | 'selected';
  readonly testedModel: string;
  readonly judgeModel: string | null;
  readonly counts: { readonly completed: number; readonly incomplete: number; readonly notRun: number };
  readonly failureProvenance?: FailureProvenance;
  readonly cases: readonly { readonly caseId: string; readonly state: 'not-run' | 'incomplete' | 'completed';
    readonly testedModel: string; readonly judgeModel: string | null; readonly attempts: readonly LocatedAttempt[] }[];
  readonly nextLocatorOffset?: number;
};

export type HeadlessEvalResult =
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly artifactPath?: string }
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly incompleteAttempt: {
      readonly caseId: string; readonly attempt: number; readonly state: 'incomplete';
      readonly diagnostics: readonly string[]; readonly diagnosticLinks: readonly DiagnosticLink[];
      readonly failureProvenance?: FailureProvenance;
      readonly turnIds: readonly string[]; readonly callIds: readonly string[];
      readonly source: SelectedProviderResponses | { readonly status: 'gap'; readonly reason: 'not-captured' };
    } }
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly failure: {
      readonly caseId: string; readonly attempt: number; readonly assertionId: string;
      readonly kind: 'assertion' | 'grader'; readonly actual: string; readonly expected: string;
      readonly diagnostics: readonly string[]; readonly artifactPath?: string; readonly truncated: boolean;
      readonly source: SelectedSourceEvidence | { readonly status: 'gap'; readonly reason: EvidenceGap };
      readonly grading: SelectedGrading;
    } }
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly gradingIssue: {
      readonly caseId: string; readonly attempt: number; readonly assertionId: string;
      readonly grading: Extract<SelectedGrading, { kind: 'rubric' }>;
      readonly source: SelectedSourceEvidence | { readonly status: 'gap'; readonly reason: EvidenceGap };
    } }
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly executionIssue: {
      readonly caseId: string; readonly attempt: number; readonly assertionId: string;
      readonly state: RunState; readonly code: 'tool-error' | 'runner-error' | 'incomplete-execution';
      readonly source: SelectedSourceEvidence | { readonly status: 'gap'; readonly reason: EvidenceGap };
    } }
  | { readonly status: 'ready'; readonly summary: HeadlessEvalSummary; readonly field: { readonly locator: string; readonly offset: number; readonly byteLength: number;
      readonly bytesBase64: string; readonly nextOffset: number | null } }
  | { readonly status: 'blocked'; readonly reason: 'invalid-input' | 'unavailable' | 'unsafe-artifact' | 'missing-artifact' | 'corrupt-artifact' | 'selection-mismatch' | 'non-failed-assertion' };
