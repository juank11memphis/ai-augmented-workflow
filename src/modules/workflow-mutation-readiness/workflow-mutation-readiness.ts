import { readStateForDoctor } from '../workflow-state-ledger/index.js';
import { getSyncPreviews, isActionableSyncPreview, type SyncPreview } from '../sync-review/index.js';
import { getUnsupportedAgentCleanupPlan } from '../sync-review/unsupported-agent-cleanup.js';
import { readTemplateManifest } from '../template-catalog/index.js';
import type { SibuState, TemplateManifest } from '../../shared/types.js';

export type WorkflowMutationReadinessResult =
  | {
      ok: true;
      state: SibuState;
      manifest: TemplateManifest;
      previews: SyncPreview[];
    }
  | {
      ok: false;
      message: string;
      hint: string;
      actionablePreviews?: SyncPreview[];
    };

export function getWorkflowMutationReadiness({ rootPath, statePath }: { rootPath: string; statePath: string }): WorkflowMutationReadinessResult {
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    return {
      ok: false,
      message: stateResult.message,
      hint: 'Run `sibu init` before selecting project skills.',
    };
  }

  const manifest = readTemplateManifest();
  const unsupportedAgentCleanupPlan = getUnsupportedAgentCleanupPlan({ rootPath, state: stateResult.state });

  if (unsupportedAgentCleanupPlan) {
    return {
      ok: false,
      message: 'Workflow state is not clean enough to select a skill safely.',
      hint: 'Run `sibu sync` to review workflow state before selecting a skill.',
    };
  }

  const previews = getSyncPreviews({ rootPath, state: stateResult.state, manifest });
  const actionablePreviews = previews.filter(isActionableSyncPreview);

  if (actionablePreviews.length > 0) {
    return {
      ok: false,
      message: 'Workflow state is not clean enough to select a skill safely.',
      hint: 'Run `sibu sync` to review workflow state before selecting a skill.',
      actionablePreviews,
    };
  }

  return {
    ok: true,
    state: stateResult.state,
    manifest,
    previews,
  };
}
