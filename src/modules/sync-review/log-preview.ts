import { log } from '@clack/prompts';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import type { SyncPreview } from './sync-preview.js';

export function logSyncPreview(preview: SyncPreview): void {
  switch (preview.status) {
    case 'up-to-date':
      log.success(`${preview.relativePath} is up to date.`);
      return;
    case 'new-template':
      if (preview.hasLocalFile) {
        log.warn(`${preview.relativePath} is expected but is not recorded in ${STATE_RELATIVE_PATH}.`);
        log.info('I will not overwrite it automatically. You can start managing it or write the latest template beside it.');
      } else {
        log.warn(`${preview.relativePath} should now be part of this workflow.`);
      }
      logTemplateChanges(preview);
      return;
    case 'missing':
      log.error(`${preview.relativePath} is missing.`);
      log.info('You can recreate it from the latest template during this sync.');
      return;
    case 'modified':
      log.warn(`${preview.relativePath} has local edits.`);
      log.info('I will not overwrite it automatically. There are no newer template changes for it right now.');
      return;
    case 'update-available':
      if (preview.recordedTemplateVersion === preview.currentTemplateVersion) {
        log.warn(`${preview.relativePath} needs generated content updates from your current project selections.`);
      } else {
        log.warn(`${preview.relativePath} has a newer template available (${preview.recordedTemplateVersion} → ${preview.currentTemplateVersion}).`);
      }
      logTemplateChanges(preview);
      return;
    case 'modified-with-update':
      if (preview.recordedTemplateVersion === preview.currentTemplateVersion) {
        log.warn(`${preview.relativePath} has local edits and also needs generated content updates from your current project selections.`);
      } else {
        log.warn(`${preview.relativePath} has local edits and a newer template is available (${preview.recordedTemplateVersion} → ${preview.currentTemplateVersion}).`);
      }
      log.info('I will not overwrite it automatically. Review the template changes below and decide what to adopt.');
      logTemplateChanges(preview);
      return;
    case 'unknown-template':
      log.warn(`${preview.relativePath} references a template that is not in templates/manifest.json.`);
      return;
    case 'unmanaged':
      log.info(`${preview.relativePath} is unmanaged. I will leave it alone.`);
      return;
  }
}

function logTemplateChanges(preview: SyncPreview): void {
  if (preview.changes.length === 0) {
    log.info('No human-readable template changes were recorded for this template.');
    return;
  }

  log.info('New template changes:');
  for (const change of preview.changes) {
    log.info(`- ${change}`);
  }
}
