import type { DoctorProjectCommand } from '../../modules/workflow-health-inspector/index.js';
import type { InitProjectCommand } from '../../modules/workflow-installer/index.js';
import type {
  ListMcpServersCommand,
  ListSkillsCommand,
  StopManagingFileCommand,
  StopMcpServerCommand,
  UseMcpServerCommand,
  UseSkillCommand,
} from '../../modules/workflow-configuration-manager/index.js';
import type { SyncProjectCommand } from '../../modules/sync-review-orchestrator/index.js';

export type SibuCliCommand =
  | InitProjectCommand
  | DoctorProjectCommand
  | SyncProjectCommand
  | ListSkillsCommand
  | StopManagingFileCommand
  | UseSkillCommand
  | ListMcpServersCommand
  | UseMcpServerCommand
  | StopMcpServerCommand;
