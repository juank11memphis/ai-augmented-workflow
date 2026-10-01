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
  emitLog(() => dependencies.logger.info({ event: 'local_evals_workbench_start_requested' }));

  let stateStatus: WorkflowStateStatus;
  try {
    stateStatus = dependencies.workflowStateReader.readWorkflowState(command.projectRoot);
  } catch {
    return failAt('workflow-state-read-failed', dependencies.logger);
  }
  if (stateStatus.status !== 'valid') {
    return blockForWorkflowState(stateStatus, dependencies.logger);
  }

  let initialDiscoveryResult;
  try {
    initialDiscoveryResult = await dependencies.suiteDiscovery.discover(command.projectRoot);
  } catch {
    return failAt('discovery-failed', dependencies.logger);
  }

  try {
    const server = await dependencies.serverStarter.startServer({ projectRoot: command.projectRoot, initialDiscoveryResult });
    emitLog(() => dependencies.logger.info({
      event: 'local_evals_workbench_started',
      host: server.host,
      port: server.port,
      suiteCount: initialDiscoveryResult.suites.length,
      discoveryStatus: initialDiscoveryResult.status,
    }));

    return {
      status: 'started',
      url: server.url,
      host: server.host,
      port: server.port,
      guidance: 'Open this local URL in your browser to use the Sibu evals workbench.',
    };
  } catch {
    return failAt('server-start-failed', dependencies.logger);
  }
}

function failAt(reason: 'workflow-state-read-failed' | 'discovery-failed' | 'server-start-failed', logger: LocalEvalsWorkbenchLoggerPort): StartLocalEvalsWorkbenchResult {
  emitLog(() => logger.error({ event: 'local_evals_workbench_start_failed', reason }));
  if (reason === 'workflow-state-read-failed') {
    return { status: 'failed', reason, message: 'Sibu could not check workflow state; the cause is unknown.', guidance: ['Run `sibu doctor` to inspect workflow state, then retry.'] };
  }
  if (reason === 'discovery-failed') {
    return { status: 'failed', reason, message: 'Sibu could not discover eval suites; the cause is unknown.', guidance: ['Check project access and retry eval suite discovery.'] };
  }
  return { status: 'failed', reason, message: 'Sibu could not start the local evals workbench server; the cause is unknown.', guidance: ['Retry startup and check whether the local server can bind to loopback.'] };
}

function blockForWorkflowState(stateStatus: Exclude<WorkflowStateStatus, { status: 'valid' }>, logger: LocalEvalsWorkbenchLoggerPort): StartLocalEvalsWorkbenchResult {
  const reason: LocalEvalsWorkbenchBlockReason = stateStatus.status === 'missing' ? 'missing-workflow-state' : 'invalid-workflow-state';
  emitLog(() => logger.warn({ event: 'local_evals_workbench_state_blocked', reason }));

  return {
    status: 'blocked',
    reason,
    message: reason === 'missing-workflow-state'
      ? 'Sibu workflow state is missing.'
      : 'Sibu workflow state is invalid.',
    guidance: buildWorkflowStateGuidance(reason),
  };
}

function emitLog(write: () => void): void {
  try { write(); } catch { /* A failed diagnostic sink must not change startup outcome. */ }
}

function buildWorkflowStateGuidance(reason: LocalEvalsWorkbenchBlockReason): readonly string[] {
  if (reason === 'missing-workflow-state') {
    return ['Run `sibu init` once from this project root to create Sibu workflow metadata.'];
  }

  return ['Run `sibu doctor` to inspect the workflow state.', 'Run `sibu sync` to review and repair managed workflow files.'];
}
