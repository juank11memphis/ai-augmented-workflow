import type { InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { LocalWorkbenchHost } from './result.js';

export type WorkflowStateStatus =
  | { readonly status: 'valid' }
  | { readonly status: 'missing'; readonly message: string }
  | { readonly status: 'invalid'; readonly message: string };

export type WorkflowStateReaderPort = {
  readWorkflowState(projectRoot: string): WorkflowStateStatus;
};

export type EvalSuiteDiscoveryPort = {
  discover(projectRoot: string): Promise<InternalEvalSuiteDiscoveryResult>;
};

export type LocalWorkbenchServerStartRequest = {
  readonly projectRoot: string;
  readonly initialDiscoveryResult: InternalEvalSuiteDiscoveryResult;
};

export type LocalWorkbenchServerStartResult = {
  readonly url: string;
  readonly host: LocalWorkbenchHost;
  readonly port: number;
  readonly stop?: () => Promise<void>;
};

export type LocalWorkbenchServerStarterPort = {
  startServer(request: LocalWorkbenchServerStartRequest): Promise<LocalWorkbenchServerStartResult>;
};

export type LocalEvalsWorkbenchLogEvent =
  | { readonly event: 'local_evals_workbench_start_requested' }
  | { readonly event: 'local_evals_workbench_state_blocked'; readonly reason: 'missing-workflow-state' | 'invalid-workflow-state' }
  | { readonly event: 'local_evals_workbench_started'; readonly host: LocalWorkbenchHost; readonly port: number; readonly suiteCount: number; readonly discoveryStatus: 'ready' | 'blocked' }
  | { readonly event: 'local_evals_workbench_start_failed'; readonly reason: 'workflow-state-read-failed' | 'discovery-failed' | 'server-start-failed' }
  | { readonly event: 'local_evals_workbench_request_issue'; readonly stage: 'discovery'; readonly outcome: 'blocked' | 'failed'; readonly reason: 'missing-evals-folder' | 'no-eval-suites' | 'unreadable-eval-suites' | 'discovery-failed' | 'unknown'; readonly reference: string };

export type LocalEvalsWorkbenchLoggerPort = {
  info(event: LocalEvalsWorkbenchLogEvent): void;
  warn(event: LocalEvalsWorkbenchLogEvent): void;
  error(event: LocalEvalsWorkbenchLogEvent): void;
};
