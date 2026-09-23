import { handleStartLocalEvalsWorkbenchCommand } from '../../modules/local-evals-workbench/index.js';
import { handleDoctorProject } from '../../modules/workflow-health-inspector/index.js';
import { handleInitProject } from '../../modules/workflow-installer/index.js';
import {
  handleListMcpServers,
  handleListSkills,
  handleStopManagingFile,
  handleStopMcpServer,
  handleUseMcpServer,
  handleUseSkill,
  resolveProjectModelRoute,
  setProjectModelRoute,
  listProjectModelRoutes,
  resetProjectModelRoutes,
} from '../../modules/workflow-configuration-manager/index.js';
import { handleSyncProject } from '../../modules/sync-review-orchestrator/index.js';
import type { SibuCliCommand } from './command.js';
import { serializeModelRouteResult } from './model-route-json.js';
import { runModelsGuidedFlow, createModelsTerminal } from './models-guided-flow.js';

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
    case 'mcp:list':
      await handleListMcpServers(command);
      return;
    case 'mcp:use':
      await handleUseMcpServer(command);
      return;
    case 'mcp:stop':
      await handleStopMcpServer(command);
      return;
    case 'evals':
      await handleStartLocalEvalsWorkbenchCommand(command);
      return;
    case 'models:resolve':
    case 'models:set': {
      try {
        const result = command.type === 'models:resolve'
          ? resolveProjectModelRoute(command, process.cwd())
          : setProjectModelRoute(command, process.cwd());
        process.stdout.write(`${serializeModelRouteResult(result)}\n`);
        if (command.type === 'models:set' && result.status !== 'saved') process.exitCode = 1;
      } catch {
        process.stderr.write('Sibu model route operation failed. Retry or run sibu doctor.\n');
        process.exitCode = 1;
      }
      return;
    }
    case 'models:guided': {
      const root = process.cwd();
      try {
        await runModelsGuidedFlow(createModelsTerminal(), {
          list: () => listProjectModelRoutes(root),
          set: (selection) => setProjectModelRoute(selection, root),
          reset: (selection) => resetProjectModelRoutes(selection, root),
        });
      } catch {
        process.stderr.write('Could not manage model routes. Run sibu doctor and retry.\n');
        process.exitCode = 1;
      }
      return;
    }
  }
}
