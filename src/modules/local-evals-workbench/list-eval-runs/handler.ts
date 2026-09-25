import type { ListEvalRunsCommand } from './command.js';
import type { ListEvalRunsResult } from './result.js';
import type { ListEvalRunsDependencies } from './ports.js';
import { logicalId, integer } from '../run-history/validation.js';
import { LIMITS } from '../run-history/limits.js';
export async function listEvalRuns(command: ListEvalRunsCommand, dependencies: ListEvalRunsDependencies): Promise<ListEvalRunsResult> {
  if (!logicalId(command.suiteId) || !integer(command.limit ?? LIMITS.history, LIMITS.history) || command.limit === 0) return { status: 'blocked', reason: 'invalid-input' };
  try {
    const result = await dependencies.reader.list(command.suiteId, command.limit ?? LIMITS.history);
    dependencies.logger.emit(result.status === 'ok' ? { event: 'artifact-read' } : { event: 'artifact-blocked', reason: result.reason });
    return result;
  } catch { return { status: 'blocked', reason: 'unavailable' }; }
}
