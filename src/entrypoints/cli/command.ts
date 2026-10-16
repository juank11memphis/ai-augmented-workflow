import type { StartLocalEvalsWorkbenchCommand, DescribeEvalSuiteRuntimeCommand, HeadlessEvalRunCommand } from '../../modules/local-evals-workbench/index.js';
import type { DoctorProjectCommand } from '../../modules/workflow-health-inspector/index.js';
import type { InitProjectCommand } from '../../modules/workflow-installer/index.js';
import type {
  ListMcpServersCommand,
  ListSkillsCommand,
  StopManagingFileCommand,
  StopMcpServerCommand,
  UseMcpServerCommand,
  UseSkillCommand,
  ResolveModelRouteCommand,
  SetModelRouteCommand,
} from '../../modules/workflow-configuration-manager/index.js';
import type { SyncProjectCommand } from '../../modules/sync-review-orchestrator/index.js';
import type { ChangeSavedModelChoiceCommand } from '../../modules/local-evals-workbench/change-saved-model-choice/index.js';

export type SibuCliCommand =
  | InitProjectCommand
  | DoctorProjectCommand
  | SyncProjectCommand
  | ListSkillsCommand
  | StopManagingFileCommand
  | UseSkillCommand
  | ListMcpServersCommand
  | UseMcpServerCommand
  | StopMcpServerCommand
  | StartLocalEvalsWorkbenchCommand
  | { readonly type: 'evals:suites' }
  | ({ readonly type: 'evals:describe' } & DescribeEvalSuiteRuntimeCommand)
  | ({ readonly type: 'evals:run' } & HeadlessEvalRunCommand)
  | ({ readonly type: 'evals:choice' } & ChangeSavedModelChoiceCommand)
  | { readonly type: 'evals:result'; readonly suiteId: string; readonly runId: string; readonly caseId?: string; readonly assertionId?: string }
  | ResolveModelRouteCommand
  | SetModelRouteCommand
  | { type: 'models:guided' };
