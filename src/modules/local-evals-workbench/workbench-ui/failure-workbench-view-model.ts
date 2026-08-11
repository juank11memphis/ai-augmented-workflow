import type { EvalArtifact, EvalAssertionResult, EvalCell, EvalDiagnostic } from '../run-local-eval-suite/result.js';

export type FailedAssertionQueueItem = {
  readonly assertionId: string;
  readonly label: string;
  readonly kind: EvalAssertionResult['kind'];
  readonly message: string;
  readonly selected: boolean;
  readonly actionLabel: string;
};

export type FailureConversationScopeKey = `${string}:${string}:${string}:${string}`;

export type ActiveFailedAssertionEvidence = {
  readonly assertionId: string;
  readonly label: string;
  readonly kind: EvalAssertionResult['kind'];
  readonly message: string;
  readonly actualPreview: string | null;
  readonly expectedPreview: string | null;
  readonly containingCellOutputPreview: string | null;
  readonly diagnostics: readonly EvalDiagnostic[];
  readonly artifacts: readonly EvalArtifact[];
};

export type FailureWorkbenchViewModel = {
  readonly title: 'Failure Workbench';
  readonly description: string;
  readonly conversationScopeKey: FailureConversationScopeKey;
  readonly queue: readonly FailedAssertionQueueItem[];
  readonly activeEvidence: ActiveFailedAssertionEvidence;
};

export function createFailureConversationScopeKey(input: {
  readonly suiteId: string;
  readonly testCaseId: string;
  readonly modelId: string;
  readonly assertionId: string;
}): FailureConversationScopeKey {
  return `${input.suiteId}:${input.testCaseId}:${input.modelId}:${input.assertionId}`;
}

export function createFailureWorkbenchViewModel(input: {
  readonly suiteId: string;
  readonly cell: EvalCell;
  readonly activeAssertionId?: string;
}): FailureWorkbenchViewModel | null {
  if (input.cell.status !== 'failed') return null;

  const failedAssertions = input.cell.assertions.filter((assertion) => assertion.status === 'failed');
  const activeAssertion = failedAssertions.find((assertion) => assertion.id === input.activeAssertionId) ?? failedAssertions[0];
  if (!activeAssertion) return null;

  return {
    title: 'Failure Workbench',
    description: `Failed · ${input.cell.modelLabel} · ${input.cell.testCaseId}`,
    conversationScopeKey: createFailureConversationScopeKey({
      suiteId: input.suiteId,
      testCaseId: input.cell.testCaseId,
      modelId: input.cell.modelId,
      assertionId: activeAssertion.id,
    }),
    queue: failedAssertions.map((assertion) => ({
      assertionId: assertion.id,
      label: assertion.label,
      kind: assertion.kind,
      message: assertion.message ?? 'No assertion message.',
      selected: assertion.id === activeAssertion.id,
      actionLabel: `${assertion.id === activeAssertion.id ? 'Selected' : 'Select'} ${assertion.kind} ${assertion.label}`,
    })),
    activeEvidence: {
      assertionId: activeAssertion.id,
      label: activeAssertion.label,
      kind: activeAssertion.kind,
      message: activeAssertion.message ?? 'No assertion message.',
      actualPreview: activeAssertion.actualPreview ?? input.cell.outputPreview,
      expectedPreview: activeAssertion.expectedPreview ?? null,
      containingCellOutputPreview: input.cell.outputPreview,
      diagnostics: [...activeAssertion.diagnostics, ...input.cell.diagnostics],
      artifacts: [...activeAssertion.artifacts, ...input.cell.artifacts],
    },
  };
}
