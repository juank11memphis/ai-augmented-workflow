import { handleDoctorProject } from '../../features/doctor-project/handler.js';
import { handleInitProject } from '../../features/init-project/handler.js';
import { handleStopManagingFile } from '../../features/stop-managing-file/handler.js';
import { handleSyncProject } from '../../features/sync-project/handler.js';
import type { EkkoCliCommand } from './command.js';

export async function executeCliCommand(command: EkkoCliCommand): Promise<void> {
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
    case 'manage:stop':
      await handleStopManagingFile(command);
      return;
  }
}
