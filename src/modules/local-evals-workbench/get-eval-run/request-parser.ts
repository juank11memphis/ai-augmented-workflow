import type { GetEvalRunCommand } from './command.js';
import { LIMITS } from '../run-history/limits.js';
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
export function parseGetRunRequest(url: URL): GetEvalRunCommand | undefined {
  if ([...url.searchParams.keys()].some(key => !['suiteId', 'runId', 'caseId', 'attempt', 'assertionId'].includes(key))) return undefined;
  const suiteId = url.searchParams.get('suiteId');
  const runId = url.searchParams.get('runId');
  if (!suiteId || !runId || !ID.test(suiteId) || !ID.test(runId)) return undefined;
  const caseId = url.searchParams.get('caseId');
  const attempt = url.searchParams.get('attempt');
  const assertionId = url.searchParams.get('assertionId');
  if (caseId === null) return attempt === null && assertionId === null ? { suiteId, runId } : undefined;
  const attemptNumber = Number(attempt);
  if (!ID.test(caseId) || !attempt || !/^[1-9]\d*$/.test(attempt) || !Number.isSafeInteger(attemptNumber)
    || attemptNumber > LIMITS.repeats || assertionId !== null && !ID.test(assertionId)) return undefined;
  return { suiteId, runId, selection: { caseId, attempt: attemptNumber, ...(assertionId ? { assertionId } : {}) } };
}
