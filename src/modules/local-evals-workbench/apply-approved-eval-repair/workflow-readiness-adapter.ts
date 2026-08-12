import path from 'node:path';

import { diagnoseState, getDoctorSyncNextStepLines } from '../../workflow-health-inspector/index.js';
import { readStateForDoctor } from '../../workflow-state-ledger/index.js';
import { STATE_RELATIVE_PATH } from '../../workflow-state-ledger/state-path.js';
import type { ManagedWorkflowReadinessPort } from './ports.js';

export class SibuManagedWorkflowReadinessAdapter implements ManagedWorkflowReadinessPort {
  async checkReadiness(projectRoot: string, targetPaths: readonly string[]) {
    const statePath = path.join(projectRoot, STATE_RELATIVE_PATH);
    const stateResult = readStateForDoctor(statePath);
    if (!stateResult.ok) return { status: 'ready' as const };

    const managedTargets = targetPaths.filter((targetPath) => stateResult.state.managedFiles[targetPath]?.status !== undefined && stateResult.state.managedFiles[targetPath]?.status !== 'unmanaged');
    if (managedTargets.length === 0) return { status: 'ready' as const };

    const issues = diagnoseState({ rootPath: projectRoot, state: stateResult.state });
    const affectedIssues = issues.filter((issue) => managedTargets.some((targetPath) => issue.message.startsWith(`${targetPath} `) || issue.message.startsWith(`${targetPath} is `)));
    if (affectedIssues.length === 0) return { status: 'ready' as const };

    return {
      status: 'blocked' as const,
      message: 'A Sibu-managed workflow target is not ready for mutation. Review workflow state before applying this repair.',
      guidance: getDoctorSyncNextStepLines(),
      affectedPaths: managedTargets,
    };
  }
}
