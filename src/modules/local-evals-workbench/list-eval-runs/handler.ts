import type { ListEvalRunsCommand } from './command.js';
import type { ListEvalRunsResult } from './result.js';
import type { ListEvalRunsDependencies } from './ports.js';
import { logicalId, integer } from '../run-history/validation.js';
import { LIMITS } from '../run-history/limits.js';
import { emitReadTransition } from '../run-history/safe-artifact-logger.js';
export async function listEvalRuns(command: ListEvalRunsCommand, dependencies: ListEvalRunsDependencies): Promise<ListEvalRunsResult> {
  if (!logicalId(command.suiteId) || !integer(command.limit ?? LIMITS.history, LIMITS.history) || command.limit === 0) return { status: 'blocked', reason: 'invalid-input' };
  let result: ListEvalRunsResult;
  try { result = await dependencies.reader.list(command.suiteId, command.limit ?? LIMITS.history); }
  catch { result = { status: 'blocked', reason: 'unavailable' }; }
  emitReadTransition(dependencies.logger, `list:${command.suiteId}`, result.status === 'blocked' ? result.reason : null);
  return result;
}
