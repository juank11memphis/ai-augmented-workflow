import type { DoctorProjectCommand } from '../../modules/workflow-health-diagnosis/index.js';
import type { InitProjectCommand } from '../../modules/project-adoption/index.js';
import type { ListSkillsCommand } from '../../features/list-skills/command.js';
import type { StopManagingFileCommand } from '../../features/stop-managing-file/command.js';
import type { SyncProjectCommand } from '../../features/sync-project/command.js';
import type { UseSkillCommand } from '../../features/use-skill/command.js';

export type SibuCliCommand = InitProjectCommand | DoctorProjectCommand | SyncProjectCommand | ListSkillsCommand | StopManagingFileCommand | UseSkillCommand;
