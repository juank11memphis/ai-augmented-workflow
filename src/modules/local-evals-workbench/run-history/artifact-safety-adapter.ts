import { access, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { ArtifactSafetyPort, Outcome } from './contracts.js';
import { ArtifactPaths, failure, missing } from './artifact-paths.js';
import { GitArtifactSafety } from './git-artifact-safety.js';
export class ArtifactSafetyAdapter implements ArtifactSafetyPort {
  constructor(readonly paths: ArtifactPaths, private readonly git = new GitArtifactSafety(paths.root)) {}
  async check(relativePaths: readonly string[] = []): Promise<Outcome<null>> {
    try {
      await this.writable(await this.paths.verify());
      for (const relative of relativePaths) await this.writable(await this.paths.verify(relative));
      return await this.git.check(relativePaths);
    } catch (error) { return failure(error); }
  }
  private async writable(target: string): Promise<void> {
    let directory = target;
    while (true) {
      try {
        const stat = await lstat(directory);
        if (!stat.isDirectory()) directory = path.dirname(directory);
        break;
      } catch (error) {
        if (!missing(error)) throw error;
        directory = path.dirname(directory);
      }
    }
    await access(directory, constants.R_OK | constants.W_OK | constants.X_OK);
  }
}
