import type { CheckEvalArtifactReadinessCommand } from './command.js';
import { artifactReadinessGuidance, type CheckEvalArtifactReadinessResult } from './result.js';
import type { CheckEvalArtifactReadinessDependencies } from './ports.js';
export async function checkEvalArtifactReadiness(command: CheckEvalArtifactReadinessCommand, dependencies: CheckEvalArtifactReadinessDependencies): Promise<CheckEvalArtifactReadinessResult> {
  if (!command.projectRoot.trim()) return { status: 'blocked', reason: 'invalid-input' };
  try {
    const result = await dependencies.safety.check(command.projectRoot);
    dependencies.logger.emit(result.status === 'ok' ? { event: 'artifact-read' } : { event: 'artifact-blocked', reason: result.reason });
    return result.status === 'ok' ? result : { ...result, guidance: artifactReadinessGuidance(result.reason) };
  } catch { return { status: 'blocked', reason: 'unavailable', guidance: artifactReadinessGuidance('unavailable') }; }
}
