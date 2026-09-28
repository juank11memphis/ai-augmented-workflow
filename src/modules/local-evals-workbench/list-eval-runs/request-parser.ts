import type { ListEvalRunsCommand } from './command.js';
import { LIMITS } from '../run-history/limits.js';

const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

export function parseListRunRequest(url: URL): ListEvalRunsCommand | undefined {
  if ([...url.searchParams.keys()].some(key => !['suiteId', 'limit'].includes(key))) return undefined;
  if (url.searchParams.getAll('suiteId').length !== 1 || url.searchParams.getAll('limit').length > 1) return undefined;
  const suiteId = url.searchParams.get('suiteId');
  const rawLimit = url.searchParams.get('limit');
  if (!suiteId || !ID.test(suiteId)) return undefined;
  if (rawLimit === null) return { suiteId };
  if (!/^[1-9]\d*$/.test(rawLimit)) return undefined;
  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit > LIMITS.history) return undefined;
  return { suiteId, limit };
}
