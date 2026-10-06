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
const MAX_TEXT = 3_000;

function clip(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;
}

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
      let remaining = MAX_TEXT;
      let clippedContent = false;
      const excerpt = (value: string | undefined, limit: number): string | null => {
        if (!value) return null;
        const length = Math.min(limit, MAX_FIELD, remaining);
        if (value.length > length) clippedContent = true;
        if (length <= 0) return null;
        remaining -= length;
        return clip(value, length);
      };
      // Category caps reserve content for both trace kinds even when primary fields are long.
      const actual = excerpt(assertion.actual, 450);
      const expected = excerpt(assertion.expected, 450);
      const diagnostics = assertion.diagnostics.slice(0, 3).map(message => ({ code: 'selected-assertion', severity: 'warning' as const, message: excerpt(message, 180) ?? '' }));
      const turns = evidence.turns.filter(turn => assertion.turnIds.includes(turn.id));
      const tools = evidence.tools.filter(tool => assertion.toolIds.includes(tool.id));
      const turnCount = Math.min(turns.length, tools.length ? 3 : MAX_ITEMS);
      const selectedTurns = turns.slice(0, turnCount);
      const selectedTools = tools.slice(0, MAX_ITEMS - selectedTurns.length);
      if (selectedTurns.length + selectedTools.length < Math.min(MAX_ITEMS, turns.length + tools.length)) {
        selectedTurns.push(...turns.slice(selectedTurns.length, MAX_ITEMS - selectedTools.length));
      }
      const artifacts = [
        ...selectedTurns.map(turn => ({ id: clip(turn.id, 80), label: clip(`Turn ${turn.role} ${turn.id}`, 100), kind: 'trace' as const, preview: excerpt(turn.content, 250) ?? undefined })),
        ...selectedTools.map(tool => ({ id: clip(tool.id, 80), label: clip(`Tool ${tool.name} (${tool.outcome ?? 'result'})`, 100), kind: 'trace' as const,
          preview: [excerpt(tool.arguments, 120), excerpt(tool.result, 120)].filter(Boolean).join('\n') || undefined })),
      ];
      const missingLinkedEvidence = turns.length < assertion.turnIds.length || tools.length < assertion.toolIds.length;
      const truncatedEvidence = clippedContent || turns.length + tools.length > artifacts.length || assertion.diagnostics.length > diagnostics.length;
      const notices = [
        ...(missingLinkedEvidence ? [{ code: 'selected-assertion', severity: 'warning' as const, message: 'Some linked trace evidence is unavailable.' }] : []),
        ...(truncatedEvidence ? [{ code: 'selected-assertion', severity: 'warning' as const, message: 'Selected evidence was truncated.' }] : []),
      ];
      diagnostics.splice(MAX_ITEMS - notices.length, Infinity, ...notices);
      let projected: FailedAssertionEvidence = {
        suiteId: selection.suiteId, runId: selection.runId, attempt: selection.attempt,
        testCaseId: selection.testCaseId, evalRunModelId: summary.testedModel, evalRunModelLabel: clip(summary.testedModel, 100),
        assertionId: assertion.id, assertionLabel: clip(assertion.id, 100), assertionKind: assertion.kind,
        assertionMessage: diagnostics[0]?.message ?? 'Selected check failed.', actualOutputPreview: actual,
        expectedPreview: expected, cellOutputPreview: null, diagnostics, artifacts,
        score: assertion.score, ...(assertion.threshold === undefined ? {} : { threshold: assertion.threshold }),
      };
      const truncationNotice = { code: 'selected-assertion', severity: 'warning' as const, message: 'Selected evidence was truncated.' };
      let budgetTruncated = false;
      while (JSON.stringify(projected).length > MAX_TOTAL) {
        const removableDiagnostic = projected.diagnostics.map(item =>
          item.message !== truncationNotice.message && item.message !== 'Some linked trace evidence is unavailable.').lastIndexOf(true);
        if (removableDiagnostic >= 0) {
          projected = { ...projected, diagnostics: projected.diagnostics.filter((_, index) => index !== removableDiagnostic) };
          budgetTruncated = true;
          continue;
        }
        const toolCount = projected.artifacts.filter(item => item.label.startsWith('Tool ')).length;
        const turnCount = projected.artifacts.length - toolCount;
        const removableArtifact = projected.artifacts.map(item =>
          item.label.startsWith('Tool ') ? toolCount > 1 : turnCount > 1).lastIndexOf(true);
        if (removableArtifact < 0) break;
        projected = { ...projected, artifacts: projected.artifacts.filter((_, index) => index !== removableArtifact) };
        budgetTruncated = true;
      }
      if (budgetTruncated && !projected.diagnostics.some(item => item.message === truncationNotice.message)) {
        projected = { ...projected, diagnostics: [...projected.diagnostics, truncationNotice] };
      }
      if (JSON.stringify(projected).length > MAX_TOTAL) return { status: 'blocked', reason: 'missing-evidence' };
      return { status: 'ready', value: { evidence: projected, testedModel: summary.testedModel,
        judgeModel: summary.judgeModel, runScope: summary.scope } };
    },
  };
}
