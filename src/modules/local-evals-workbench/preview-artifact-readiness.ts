import { ArtifactPaths } from './run-history/artifact-paths.js';
import { ArtifactSafetyAdapter } from './run-history/artifact-safety-adapter.js';
import type { ArtifactReadinessPort } from './preview-eval-run/ports.js';
import type { RuntimeOutcome } from './runtime-description.js';
import type { Reason } from './run-history/contracts.js';
export class PreviewArtifactReadiness implements ArtifactReadinessPort {
  private readonly safety: ArtifactSafetyAdapter;
  constructor(projectRoot: string) { this.safety = new ArtifactSafetyAdapter(new ArtifactPaths(projectRoot)); }
  async check(): Promise<RuntimeOutcome<null>> {
    const result = await this.safety.check();
    return result.status === 'ok' ? { status: 'ready', value: null } : { status: 'blocked', reason: mapArtifactReason(result.reason) };
  }
}
export function mapArtifactReason(reason: Reason): 'artifact-not-ignored' | 'artifact-tracked' | 'artifact-git-unavailable' | 'artifact-root-unsafe' | 'artifact-unsafe' {
  if (reason === 'not-ignored') return 'artifact-not-ignored';
  if (reason === 'tracked-artifacts') return 'artifact-tracked';
  if (reason === 'git-unavailable') return 'artifact-git-unavailable';
  if (reason === 'unsafe-path' || reason === 'unverifiable-root') return 'artifact-root-unsafe';
  return 'artifact-unsafe';
}
