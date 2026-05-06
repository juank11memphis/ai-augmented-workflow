import type { DoctorProjectCommand } from '../../modules/workflow-health-diagnosis/index.js';
import type { InitProjectCommand } from '../../modules/project-adoption/index.js';
import type { ListSkillsCommand } from '../../modules/skill-selection-management/index.js';
import type { StopManagingFileCommand } from '../../modules/skill-selection-management/index.js';
import type { SyncProjectCommand } from '../../modules/sync-review/index.js';
import type { UseSkillCommand } from '../../modules/skill-selection-management/index.js';

export type SibuCliCommand = InitProjectCommand | DoctorProjectCommand | SyncProjectCommand | ListSkillsCommand | StopManagingFileCommand | UseSkillCommand;
