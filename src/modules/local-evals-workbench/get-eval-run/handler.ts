import type { GetEvalRunCommand } from './command.js';
import type { GetEvalRunResult } from './result.js';
import type { GetEvalRunDependencies } from './ports.js';
import { logicalId, integer } from '../run-history/validation.js';
import { LIMITS } from '../run-history/limits.js';
import { emitReadTransition } from '../run-history/safe-artifact-logger.js';
export async function getEvalRun(command: GetEvalRunCommand, dependencies: GetEvalRunDependencies): Promise<GetEvalRunResult> {
  if (!logicalId(command.suiteId) || !logicalId(command.runId) || command.selection && (!logicalId(command.selection.caseId) || !integer(command.selection.attempt, LIMITS.repeats) || command.selection.attempt < 1 || command.selection.assertionId !== undefined && !logicalId(command.selection.assertionId))) return { status: 'blocked', reason: 'invalid-input' };
  let result: GetEvalRunResult;
  try { result = await dependencies.reader.get(command.suiteId, command.runId, command.selection); }
  catch { result = { status: 'blocked', reason: 'unavailable' }; }
  const reason = result.status === 'blocked' ? result.reason
    : result.value.evidenceStatus === 'unavailable' ? result.warnings?.at(-1) ?? 'unavailable' : null;
  emitReadTransition(dependencies.logger, `get:${command.suiteId}:${command.runId}:${command.selection?.caseId ?? ''}:${command.selection?.attempt ?? ''}:${command.selection?.assertionId ?? ''}`, reason);
  return result;
}
