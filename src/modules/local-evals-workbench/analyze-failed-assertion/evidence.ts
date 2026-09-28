import type { EvalAssertionResult, EvalCell } from '../run-local-eval-suite/result.js';
import type { FailedAssertionEvidence } from '../repair-context/contracts.js';
export type { FailedAssertionEvidence, SafeEvidenceDiagnostic, SafeEvidenceArtifact } from '../repair-context/contracts.js';

const MAX_PREVIEW_LENGTH = 600;
const MAX_ITEMS = 6;

export function buildFailedAssertionEvidence(input: {
  readonly suiteId: string;
  readonly cell: EvalCell;
  readonly assertion: EvalAssertionResult;
}): FailedAssertionEvidence {
  return {
    suiteId: input.suiteId,
    testCaseId: input.cell.testCaseId,
    evalRunModelId: input.cell.modelId,
    evalRunModelLabel: input.cell.modelLabel,
    assertionId: input.assertion.id,
    assertionLabel: input.assertion.label,
    assertionKind: input.assertion.kind,
    assertionMessage: truncate(input.assertion.message ?? 'No assertion message.') ?? 'No assertion message.',
    actualOutputPreview: truncate(input.assertion.actualPreview ?? input.cell.outputPreview),
    expectedPreview: truncate(input.assertion.expectedPreview),
    cellOutputPreview: truncate(input.cell.outputPreview),
    diagnostics: [...input.assertion.diagnostics, ...input.cell.diagnostics].slice(0, MAX_ITEMS).map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: truncate(diagnostic.message) ?? '',
      location: truncate(diagnostic.location) ?? undefined,
    })),
    artifacts: [...input.assertion.artifacts, ...input.cell.artifacts].slice(0, MAX_ITEMS).map((artifact) => ({
      id: artifact.id,
      label: artifact.label,
      kind: artifact.kind,
      preview: truncate(artifact.preview) ?? undefined,
      reference: truncate(artifact.reference) ?? undefined,
    })),
  };
}

function truncate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length > MAX_PREVIEW_LENGTH ? `${value.slice(0, MAX_PREVIEW_LENGTH)}…` : value;
}
