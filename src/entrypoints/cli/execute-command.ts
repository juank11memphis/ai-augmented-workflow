import { handleDoctorProject } from '../../features/doctor-project/handler.js';
import { handleInitProject } from '../../features/init-project/handler.js';
import { handleListSkills } from '../../features/list-skills/handler.js';
import { handleStopManagingFile } from '../../features/stop-managing-file/handler.js';
import { handleSyncProject } from '../../features/sync-project/handler.js';
import { handleUseSkill } from '../../features/use-skill/handler.js';
import type { EchoCliCommand } from './command.js';

export async function executeCliCommand(command: EchoCliCommand): Promise<void> {
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
