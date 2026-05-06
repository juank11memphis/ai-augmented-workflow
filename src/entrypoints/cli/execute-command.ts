import { handleDoctorProject } from '../../modules/workflow-health-diagnosis/index.js';
import { handleInitProject } from '../../modules/project-adoption/index.js';
import { handleListSkills } from '../../modules/skill-selection-management/index.js';
import { handleStopManagingFile } from '../../modules/skill-selection-management/index.js';
import { handleSyncProject } from '../../modules/sync-review/index.js';
import { handleUseSkill } from '../../modules/skill-selection-management/index.js';
import type { SibuCliCommand } from './command.js';

export async function executeCliCommand(command: SibuCliCommand): Promise<void> {
  switch (command.type) {
    case 'init':
      await handleInitProject(command);
      return;
    case 'doctor':
      await handleDoctorProject(command);
      return;
    case 'sync':
      await handleSyncProject(command);
      return;
    case 'skills:list':
      await handleListSkills(command);
      return;
    case 'skills:stop':
      await handleStopManagingFile(command);
      return;
    case 'skills:use':
      await handleUseSkill(command);
      return;
  }
}
