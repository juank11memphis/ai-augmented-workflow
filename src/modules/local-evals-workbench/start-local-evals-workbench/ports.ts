import type { InternalEvalSuiteDiscoveryResult } from '../discover-conventional-eval-suites/index.js';
import type { LocalWorkbenchHost } from './result.js';
import type { RuntimeBlockReason } from '../runtime-description.js';
import type { StartEvalRunResult } from '../start-eval-run/result.js';
import type { Reason } from '../run-history/contracts.js';
import type { AnalyzeFailedAssertionLogEvent } from '../analyze-failed-assertion/ports.js';

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
  | (AnalyzeFailedAssertionLogEvent & { readonly reference: string })
  | { readonly event: 'local_evals_workbench_analysis_boundary_issue'; readonly stage: 'analysis'; readonly outcome: 'blocked' | 'failed'; readonly reason: 'invalid-request' | 'unknown'; readonly reference: string }
  | { readonly event: 'local_evals_workbench_start_requested' }
  | { readonly event: 'local_evals_workbench_state_blocked'; readonly reason: 'missing-workflow-state' | 'invalid-workflow-state' }
  | { readonly event: 'local_evals_workbench_started'; readonly host: LocalWorkbenchHost; readonly port: number; readonly suiteCount: number; readonly discoveryStatus: 'ready' | 'blocked' }
  | { readonly event: 'local_evals_workbench_start_failed'; readonly reason: 'workflow-state-read-failed' | 'discovery-failed' | 'server-start-failed' }
  | { readonly event: 'local_evals_workbench_request_started' | 'local_evals_workbench_request_completed'; readonly stage: 'preview'; readonly outcome: 'started' | 'completed'; readonly reference: string }
  | { readonly event: 'local_evals_workbench_request_issue'; readonly stage: 'discovery' | 'model-check' | 'preview' | 'run-start'; readonly outcome: 'blocked' | 'failed'; readonly reason: 'missing-evals-folder' | 'no-eval-suites' | 'unreadable-eval-suites' | 'discovery-failed' | RuntimeBlockReason | Extract<StartEvalRunResult, { status: 'blocked' }>['reason'] | 'invalid-request' | 'unknown' | 'reference-reused'; readonly reference: string }
  | { readonly event: 'local_evals_workbench_run_start_queued'; readonly stage: 'run-start'; readonly outcome: 'queued'; readonly reference: string; readonly runId: string }
  | { readonly event: 'local_evals_workbench_run_start_response_failed'; readonly stage: 'run-start'; readonly outcome: 'uncertain'; readonly reason: 'response-write-failed'; readonly reference: string; readonly runId: string }
  | { readonly event: 'local_evals_workbench_read_issue'; readonly stage: 'status' | 'history'; readonly outcome: 'blocked' | 'failed'; readonly reason: Reason | 'invalid-request' | 'unknown'; readonly reference: string };

export type LocalEvalsWorkbenchLoggerPort = {
  info(event: LocalEvalsWorkbenchLogEvent): void;
  warn(event: LocalEvalsWorkbenchLogEvent): void;
  error(event: LocalEvalsWorkbenchLogEvent): void;
};
