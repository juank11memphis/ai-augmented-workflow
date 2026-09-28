import type { GetEvalRunCommand, GetEvalRunResult } from '../get-eval-run/index.js';
import type { FailedAssertionEvidence } from './contracts.js';

export type FailureSelection = {
  readonly suiteId: string;
  readonly runId: string;
  readonly testCaseId: string;
  readonly attempt: number;
  readonly assertionId: string;
};

export type SelectedFailure = {
  readonly evidence: FailedAssertionEvidence;
  readonly testedModel: string;
  readonly judgeModel: string | null;
  readonly repeats: number;
  readonly runScope: 'all' | 'selected';
};

export type SelectedFailureRead =
  | { readonly status: 'ready'; readonly value: SelectedFailure }
  | { readonly status: 'blocked'; readonly reason: 'missing-run' | 'missing-evidence' | 'mismatched-evidence' | 'non-failed-assertion' };

export type SelectedFailureReader = {
  read(selection: FailureSelection): Promise<SelectedFailureRead>;
};

const MAX_FIELD = 600;
const MAX_ITEMS = 6;
const MAX_TOTAL = 4_800;

export function createSelectedFailureReader(getRun: (command: GetEvalRunCommand) => Promise<GetEvalRunResult>): SelectedFailureReader {
  return {
    async read(selection) {
      const result = await getRun({ suiteId: selection.suiteId, runId: selection.runId,
        selection: { caseId: selection.testCaseId, attempt: selection.attempt, assertionId: selection.assertionId } });
      if (result.status !== 'ok') return { status: 'blocked', reason: 'missing-run' };
      const { summary, evidence, evidenceStatus } = result.value;
      if (evidenceStatus !== 'available' || !evidence) return { status: 'blocked', reason: 'missing-evidence' };
      if (summary.suiteId !== selection.suiteId || summary.runId !== selection.runId || evidence.suiteId !== selection.suiteId
        || evidence.runId !== selection.runId || evidence.caseId !== selection.testCaseId || evidence.number !== selection.attempt
        || !summary.cases.some(item => item.caseId === selection.testCaseId && item.attempts.some(attempt => attempt.number === selection.attempt))) {
        return { status: 'blocked', reason: 'mismatched-evidence' };
      }
      const assertion = evidence.assertions.find(item => item.id === selection.assertionId);
      if (!assertion || evidence.assertions.length !== 1) return { status: 'blocked', reason: 'mismatched-evidence' };
      if (assertion.outcome !== 'failed' || evidence.outcome !== 'failed') return { status: 'blocked', reason: 'non-failed-assertion' };
      let remaining = MAX_TOTAL;
      const excerpt = (value: string | undefined): string | null => {
        if (!value || remaining <= 0) return null;
        const length = Math.min(value.length, MAX_FIELD, remaining);
        remaining -= length;
        return value.slice(0, length) + (length < value.length ? '…' : '');
      };
      const actual = excerpt(assertion.actual);
      const expected = excerpt(assertion.expected);
      const diagnostics = assertion.diagnostics.slice(0, MAX_ITEMS).map(message => ({ code: 'selected-assertion', severity: 'warning' as const, message: excerpt(message) ?? '' }));
      const artifacts = [
        ...evidence.turns.slice(0, MAX_ITEMS).map(turn => ({ id: turn.id, label: `Turn ${turn.id}`, kind: 'trace' as const, preview: excerpt(turn.content) ?? undefined })),
        ...evidence.tools.slice(0, MAX_ITEMS).map(tool => ({ id: tool.id, label: `Tool ${tool.name}`, kind: 'trace' as const, preview: excerpt(`${tool.arguments}\n${tool.result}`) ?? undefined })),
      ].slice(0, MAX_ITEMS);
      const projected: FailedAssertionEvidence = {
        suiteId: selection.suiteId, runId: selection.runId, attempt: selection.attempt,
        testCaseId: selection.testCaseId, evalRunModelId: summary.testedModel, evalRunModelLabel: summary.testedModel,
        assertionId: assertion.id, assertionLabel: assertion.id, assertionKind: assertion.kind,
        assertionMessage: diagnostics[0]?.message ?? 'Selected check failed.', actualOutputPreview: actual,
        expectedPreview: expected, cellOutputPreview: null, diagnostics, artifacts,
        score: assertion.score, ...(assertion.threshold === undefined ? {} : { threshold: assertion.threshold }),
      };
      return { status: 'ready', value: { evidence: projected, testedModel: summary.testedModel,
        judgeModel: summary.judgeModel, repeats: summary.repeats, runScope: summary.scope } };
    },
  };
}
