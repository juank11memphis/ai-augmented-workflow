import { ArtifactPaths } from './artifact-paths.js';
import { ArtifactSafetyAdapter } from './artifact-safety-adapter.js';
import { AtomicArtifactFile, type WriteStage } from './atomic-artifact-file.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { FileArtifactStore } from './file-artifact-store.js';
import type { OwnerPort, ArtifactLogger } from './contracts.js';
export function fixture(root: string, options: { fault?: (stage: WriteStage, path: string) => void; owner?: OwnerPort; onRead?: (path: string) => void; generateId?: (now: number) => string; logger?: ArtifactLogger } = {}) {
  const paths = new ArtifactPaths(root); const safety = new ArtifactSafetyAdapter(paths);
  const files = new AtomicArtifactFile(paths, safety, options.fault); const reader = new BoundedArtifactReader(paths, options.onRead);
  const owner: OwnerPort = options.owner ?? { identity: { pid: 123, token: 'owner' }, async check() { return 'live'; } };
  const logger = options.logger ?? { emit() {} };
  const store = new FileArtifactStore({ files, reader, owner, clock: Date.now, logger, generateId: options.generateId });
  return { paths, safety, files, reader, owner, logger, store };
}
