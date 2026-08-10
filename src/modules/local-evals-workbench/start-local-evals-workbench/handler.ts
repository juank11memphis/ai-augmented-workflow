import type { StartLocalEvalsWorkbenchCommand } from './command.js';
import type { EvalSuiteDiscoveryPort, LocalEvalsWorkbenchLoggerPort, LocalWorkbenchServerStarterPort, WorkflowStateReaderPort, WorkflowStateStatus } from './ports.js';
import type { LocalEvalsWorkbenchBlockReason, StartLocalEvalsWorkbenchResult } from './result.js';

export type StartLocalEvalsWorkbenchHandlerDependencies = {
  readonly workflowStateReader: WorkflowStateReaderPort;
  readonly suiteDiscovery: EvalSuiteDiscoveryPort;
  readonly serverStarter: LocalWorkbenchServerStarterPort;
  readonly logger: LocalEvalsWorkbenchLoggerPort;
};

export async function startLocalEvalsWorkbench(
  command: StartLocalEvalsWorkbenchCommand,
  dependencies: StartLocalEvalsWorkbenchHandlerDependencies
): Promise<StartLocalEvalsWorkbenchResult> {
  dependencies.logger.info({ event: 'local_evals_workbench_start_requested' });

  const stateStatus = dependencies.workflowStateReader.readWorkflowState(command.projectRoot);
  if (stateStatus.status !== 'valid') {
    return blockForWorkflowState(stateStatus, dependencies.logger);
  }

  try {
    const initialDiscoveryResult = await dependencies.suiteDiscovery.discover(command.projectRoot);
    const server = await dependencies.serverStarter.startServer({ projectRoot: command.projectRoot, initialDiscoveryResult });
    dependencies.logger.info({
      event: 'local_evals_workbench_started',
      host: server.host,
      port: server.port,
      suiteCount: initialDiscoveryResult.suites.length,
      discoveryStatus: initialDiscoveryResult.status,
    });

    return {
      status: 'started',
      url: server.url,
      host: server.host,
      port: server.port,
      guidance: 'Open this local URL in your browser to use the Sibu evals workbench.',
    };
  } catch {
    dependencies.logger.error({ event: 'local_evals_workbench_start_failed', reason: 'server-start-failed' });

    return {
      status: 'failed',
      reason: 'server-start-failed',
      message: 'Sibu could not start the local evals workbench server.',
      guidance: ['Try again, or check whether another local process is blocking the selected port.'],
    };
  }
}

function blockForWorkflowState(stateStatus: Exclude<WorkflowStateStatus, { status: 'valid' }>, logger: LocalEvalsWorkbenchLoggerPort): StartLocalEvalsWorkbenchResult {
  const reason: LocalEvalsWorkbenchBlockReason = stateStatus.status === 'missing' ? 'missing-workflow-state' : 'invalid-workflow-state';
  logger.warn({ event: 'local_evals_workbench_state_blocked', reason });

  return {
    status: 'blocked',
    reason,
    message: stateStatus.message,
    guidance: buildWorkflowStateGuidance(reason),
  };
}

function buildWorkflowStateGuidance(reason: LocalEvalsWorkbenchBlockReason): readonly string[] {
  if (reason === 'missing-workflow-state') {
    return ['Run `sibu init` once from this project root to create Sibu workflow metadata.'];
  }

  return ['Run `sibu doctor` to inspect the workflow state.', 'Run `sibu sync` to review and repair managed workflow files.'];
}
