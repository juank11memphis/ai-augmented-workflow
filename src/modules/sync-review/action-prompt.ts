import { cancel, isCancel, select } from '@clack/prompts';

import type { SyncPreview } from './sync-preview.js';

export type SyncAction = 'apply-update' | 'mark-reviewed' | 'write-side-template' | 'stop-managing' | 'skip';

export async function askForSyncAction(preview: SyncPreview): Promise<SyncAction> {
  if (preview.status === 'update-available') {
    const action = await select<SyncAction>({
      message: `What should I do with ${preview.relativePath}?`,
      options: [
        { value: 'apply-update', label: 'Apply update', hint: 'Safe because no local edits were detected.' },
        { value: 'skip', label: 'Skip for now' },
      ],
    });

    return handleSyncActionCancel(action);
  }

  if (preview.status === 'missing') {
    const action = await select<SyncAction>({
      message: `What should I do with ${preview.relativePath}?`,
      options: [
        { value: 'apply-update', label: 'Recreate file', hint: 'Write the latest template and update Sibu state.' },
        { value: 'stop-managing', label: 'Stop managing this file', hint: 'Opt this file out of Sibu missing-file warnings.' },
        { value: 'skip', label: 'Skip for now' },
      ],
    });

    return handleSyncActionCancel(action);
  }

  if (preview.status === 'new-template') {
    const options: Array<{ value: SyncAction; label: string; hint?: string }> = preview.hasLocalFile
      ? [
          { value: 'mark-reviewed', label: 'Start managing existing file', hint: 'Keep the file unchanged and record it in Sibu state.' },
          { value: 'write-side-template', label: 'Write latest template beside my file', hint: 'Create a reference copy under .sibu/sync/.' },
          { value: 'skip', label: 'Skip for now' },
        ]
      : [
          { value: 'apply-update', label: 'Create file', hint: 'Write the latest template and record it in Sibu state.' },
          { value: 'skip', label: 'Skip for now' },
        ];

    const action = await select<SyncAction>({
      message: `What should I do with ${preview.relativePath}?`,
      options,
    });

    return handleSyncActionCancel(action);
  }

  const options: Array<{ value: SyncAction; label: string; hint?: string }> = [
    { value: 'mark-reviewed', label: 'Mark as reviewed', hint: 'Keep my file and stop warning about this template version.' },
    { value: 'stop-managing', label: 'Stop managing this file', hint: 'Opt this file out of Sibu template drift warnings.' },
    { value: 'skip', label: 'Skip for now' },
  ];

  if (preview.status === 'modified-with-update') {
    options.splice(1, 0, {
      value: 'write-side-template',
      label: 'Write latest template beside my file',
      hint: 'Create a reference copy under .sibu/sync/.',
    });
  }

  const action = await select<SyncAction>({
    message: `What should I do with ${preview.relativePath}?`,
    options,
  });

  return handleSyncActionCancel(action);
}

function handleSyncActionCancel(action: SyncAction | symbol): SyncAction {
  if (isCancel(action)) {
    cancel('Sync cancelled.');
    process.exit(0);
  }

  return action;
}
