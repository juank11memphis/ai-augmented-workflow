import type { ArtifactReaderPort, Manifest } from './contracts.js';
import { logicalId } from './validation.js';

export type LocatedAttempt = {
  readonly number: number;
  readonly outcome: 'passed' | 'failed' | 'incomplete';
  readonly failedAssertionIds?: readonly string[];
  readonly incompleteLocator?: { readonly caseId: string; readonly attempt: number };
  readonly locatorStatus?: 'available' | 'unavailable' | 'truncated';
};

const MAX_IDS = 32;

/** Project only identifiers from the safe, bounded attempt reader. */
export async function failedAssertionLocators(
  manifest: Manifest,
  reader: Pick<ArtifactReaderPort, 'get'>,
  offset = 0,
): Promise<{ readonly cases: readonly { readonly caseId: string; readonly state: Manifest['cases'][number]['state'];
  readonly testedModel: string; readonly judgeModel: string | null; readonly attempts: readonly LocatedAttempt[] }[];
  readonly nextLocatorOffset: number | null }> {
  let remaining = MAX_IDS;
  let skipped = 0;
  let more = false;
  const cases = [];
  for (const item of manifest.cases) {
    const attempts: LocatedAttempt[] = [];
    for (const attempt of item.attempts) {
      if (attempt.outcome === 'incomplete') {
        attempts.push({ number: attempt.number, outcome: attempt.outcome,
          incompleteLocator: { caseId: item.caseId, attempt: attempt.number } });
        continue;
      }
      if (attempt.outcome !== 'failed') {
        attempts.push({ number: attempt.number, outcome: attempt.outcome });
        continue;
      }
      if (remaining === 0) {
        attempts.push({ number: attempt.number, outcome: attempt.outcome, failedAssertionIds: [], locatorStatus: 'truncated' });
        more = true;
        continue;
      }
      try {
        const read = await reader.get(manifest.suiteId, manifest.runId, { caseId: item.caseId, attempt: attempt.number });
        const evidence = read.status === 'ok' && read.value.evidenceStatus === 'available' ? read.value.evidence : undefined;
        const matches = evidence && evidence.suiteId === manifest.suiteId && evidence.runId === manifest.runId &&
          evidence.caseId === item.caseId && evidence.number === attempt.number && evidence.outcome === 'failed';
        const failed = matches ? evidence.assertions.filter(assertion => assertion.outcome === 'failed') : [];
        if (!failed.length || failed.some(assertion => !logicalId(assertion.id)) ||
          new Set(failed.map(assertion => assertion.id)).size !== failed.length) {
          attempts.push({ number: attempt.number, outcome: attempt.outcome, failedAssertionIds: [], locatorStatus: 'unavailable' });
          continue;
        }
        const start = Math.max(0, offset - skipped);
        const ids = failed.slice(start, start + remaining).map(assertion => assertion.id);
        skipped += failed.length;
        remaining -= ids.length;
        if (start + ids.length < failed.length) more = true;
        attempts.push({ number: attempt.number, outcome: attempt.outcome, failedAssertionIds: ids,
          locatorStatus: ids.length < failed.length ? 'truncated' : 'available' });
      } catch {
        attempts.push({ number: attempt.number, outcome: attempt.outcome, failedAssertionIds: [], locatorStatus: 'unavailable' });
      }
    }
    cases.push({ caseId: item.caseId, state: item.state,
      testedModel: item.testedModel ?? manifest.testedModel, judgeModel: item.judgeModel !== undefined ? item.judgeModel : manifest.judgeModel, attempts });
  }
  return { cases, nextLocatorOffset: more ? offset + (MAX_IDS - remaining) : null };
}
