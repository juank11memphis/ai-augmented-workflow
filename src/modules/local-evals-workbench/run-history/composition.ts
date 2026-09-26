import { checkEvalArtifactReadiness } from '../check-eval-artifact-readiness/index.js';
import { listEvalRuns, type ListEvalRunsCommand } from '../list-eval-runs/index.js';
import { getEvalRun, type GetEvalRunCommand } from '../get-eval-run/index.js';
import type { ArtifactStorePort, OwnerPort } from './contracts.js';
import { ArtifactPaths } from './artifact-paths.js';
import { ArtifactSafetyAdapter } from './artifact-safety-adapter.js';
import { AtomicArtifactFile } from './atomic-artifact-file.js';
import { BoundedArtifactReader } from './bounded-artifact-reader.js';
import { FileArtifactStore } from './file-artifact-store.js';
import { FileArtifactReader } from './file-artifact-reader.js';
import { ProcessRunOwner } from './active-run-owner.js';
import { InterruptedRunRecovery } from './interrupted-run-recovery.js';
import { SafeArtifactLogger } from './safe-artifact-logger.js';
/** Supports one Sibu process per project. Concurrent processes may lose index updates. */
export function createRunHistory(projectRoot: string, dependencies: {
  readonly owner?: OwnerPort; readonly clock?: () => number;
  readonly log?: (line: string) => void;
  readonly legacyRecoveryOnRead?: boolean;
} = {}) {
  const paths = new ArtifactPaths(projectRoot); const safety = new ArtifactSafetyAdapter(paths);
  const owner = dependencies.owner ?? new ProcessRunOwner(); const clock = dependencies.clock ?? Date.now;
  const logger = new SafeArtifactLogger(dependencies.log); const bounded = new BoundedArtifactReader(paths);
  const store = new FileArtifactStore({ files: new AtomicArtifactFile(paths, safety), reader: bounded, owner, clock, logger });
  const recovery = dependencies.legacyRecoveryOnRead ? new InterruptedRunRecovery(owner, clock, store) : undefined;
  const reader = new FileArtifactReader(paths, bounded, recovery);
  return {
    store: store as ArtifactStorePort,
    checkReadiness: () => checkEvalArtifactReadiness({ projectRoot: paths.root }, { safety: {
      check: async requestedRoot => requestedRoot === paths.root ? safety.check() : { status: 'blocked', reason: 'invalid-input' },
    }, logger }),
    list: (command: ListEvalRunsCommand) => listEvalRuns(command, { reader, logger }),
    get: (command: GetEvalRunCommand) => getEvalRun(command, { reader, logger }),
  };
}
