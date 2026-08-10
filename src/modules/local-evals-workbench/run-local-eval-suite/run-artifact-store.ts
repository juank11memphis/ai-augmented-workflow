import type { RunArtifactStorePort } from './ports.js';
import type { EvalMatrix } from './result.js';

export type StoredRunArtifact = {
  readonly suiteId: string;
  readonly modelId: string;
  readonly scope: 'all' | 'test_case';
  readonly testCaseId?: string;
  readonly matrix: EvalMatrix;
};

export class InMemoryRunArtifactStore implements RunArtifactStorePort {
  private readonly artifacts = new Map<string, StoredRunArtifact>();

  async storeRunArtifact(request: Parameters<RunArtifactStorePort['storeRunArtifact']>[0]): Promise<void> {
    const key = artifactKey(request.suiteId, request.evalRunModel.id, request.scope.type, request.scope.type === 'test_case' ? request.scope.testCaseId : undefined);
    this.artifacts.set(key, {
      suiteId: request.suiteId,
      modelId: request.evalRunModel.id,
      scope: request.scope.type,
      testCaseId: request.scope.type === 'test_case' ? request.scope.testCaseId : undefined,
      matrix: request.matrix,
    });
  }

  getRunArtifact(suiteId: string, modelId: string, scope: 'all' | 'test_case', testCaseId?: string): StoredRunArtifact | undefined {
    return this.artifacts.get(artifactKey(suiteId, modelId, scope, testCaseId));
  }
}

function artifactKey(suiteId: string, modelId: string, scope: 'all' | 'test_case', testCaseId?: string): string {
  return [suiteId, modelId, scope, testCaseId ?? ''].join('\u001f');
}
