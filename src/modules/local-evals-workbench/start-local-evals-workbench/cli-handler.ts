import { getProjectContext } from '../../../shared/paths.js';
import type { StartLocalEvalsWorkbenchCommand } from './command.js';
import { startLocalEvalsWorkbench, type StartLocalEvalsWorkbenchHandlerDependencies } from './handler.js';
import { NodeLocalWorkbenchServerStarter } from './local-server-starter.js';
import type { StartLocalEvalsWorkbenchResult } from './result.js';
import { SafeConsoleLocalEvalsLogger } from './safe-console-logger.js';
import { SibuWorkflowStateReader } from './workflow-state-reader.js';

export type HandleStartLocalEvalsWorkbenchDependencies = Partial<StartLocalEvalsWorkbenchHandlerDependencies> & {
  readonly writeLine?: (message: string) => void;
  readonly setExitCode?: (code: number) => void;
};

export async function handleStartLocalEvalsWorkbenchCommand(
  command: StartLocalEvalsWorkbenchCommand,
  dependencies: HandleStartLocalEvalsWorkbenchDependencies = {}
): Promise<StartLocalEvalsWorkbenchResult> {
  const handlerDependencies: StartLocalEvalsWorkbenchHandlerDependencies = {
    workflowStateReader: dependencies.workflowStateReader ?? new SibuWorkflowStateReader(),
    serverStarter: dependencies.serverStarter ?? new NodeLocalWorkbenchServerStarter(),
    logger: dependencies.logger ?? new SafeConsoleLocalEvalsLogger(),
  };
  const result = await startLocalEvalsWorkbench(command, handlerDependencies);
  const writeLine = dependencies.writeLine ?? console.log;

  for (const line of formatStartLocalEvalsWorkbenchResult(result)) {
    writeLine(line);
  }

  if (result.status !== 'started') {
    (dependencies.setExitCode ?? ((code: number) => (process.exitCode = code)))(1);
  }

  return result;
}

export function createStartLocalEvalsWorkbenchCommand(): StartLocalEvalsWorkbenchCommand {
  return { type: 'evals', projectRoot: getProjectContext().rootPath };
}

export function formatStartLocalEvalsWorkbenchResult(result: StartLocalEvalsWorkbenchResult): readonly string[] {
  if (result.status === 'started') {
    return ['Sibu local evals workbench is running.', `URL: ${result.url}`, result.guidance];
  }

  return [result.message, ...result.guidance];
}
