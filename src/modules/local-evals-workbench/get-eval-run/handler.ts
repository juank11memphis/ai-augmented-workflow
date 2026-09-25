import type { GetEvalRunCommand } from './command.js';
import type { GetEvalRunResult } from './result.js';
import type { GetEvalRunDependencies } from './ports.js';
import { logicalId, integer } from '../run-history/validation.js';
import { LIMITS } from '../run-history/limits.js';
export async function getEvalRun(command: GetEvalRunCommand, dependencies: GetEvalRunDependencies): Promise<GetEvalRunResult> {
  if (!logicalId(command.suiteId) || !logicalId(command.runId) || command.selection && (!logicalId(command.selection.caseId) || !integer(command.selection.attempt, LIMITS.repeats) || command.selection.attempt < 1 || command.selection.assertionId !== undefined && !logicalId(command.selection.assertionId))) return { status: 'blocked', reason: 'invalid-input' };
  try {
    const result = await dependencies.reader.get(command.suiteId, command.runId, command.selection);
    dependencies.logger.emit(result.status === 'ok' ? { event: 'artifact-read' } : { event: 'artifact-blocked', reason: result.reason });
    return result;
  } catch { return { status: 'blocked', reason: 'unavailable' }; }
}
