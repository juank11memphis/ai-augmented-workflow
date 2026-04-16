import type { DoctorProjectCommand } from '../../features/doctor-project/command.js';
import type { InitProjectCommand } from '../../features/init-project/command.js';
import type { ListSkillsCommand } from '../../features/list-skills/command.js';
import type { StopManagingFileCommand } from '../../features/stop-managing-file/command.js';
import type { SyncProjectCommand } from '../../features/sync-project/command.js';

export type EkkoCliCommand = InitProjectCommand | DoctorProjectCommand | SyncProjectCommand | ListSkillsCommand | StopManagingFileCommand;
