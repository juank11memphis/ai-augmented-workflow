import { readStateForDoctor } from './state.js';
import { getSyncPreviews, isActionableSyncPreview, type SyncPreview } from './sync-preview.js';
import { readTemplateManifest } from './templates.js';
import type { EchoState, TemplateManifest } from './types.js';

export type WorkflowMutationReadinessResult =
  | {
      ok: true;
      state: EchoState;
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
      hint: 'Run `echo init` before selecting project skills.',
    };
  }

  const manifest = readTemplateManifest();
  const previews = getSyncPreviews({ rootPath, state: stateResult.state, manifest });
  const actionablePreviews = previews.filter(isActionableSyncPreview);

  if (actionablePreviews.length > 0) {
    return {
      ok: false,
      message: 'Workflow state is not clean enough to select a skill safely.',
      hint: 'Run `echo sync` to review workflow drift before selecting a skill.',
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
