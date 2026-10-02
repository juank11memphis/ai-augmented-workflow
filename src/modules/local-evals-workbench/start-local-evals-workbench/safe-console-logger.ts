import type { EvalSuiteDiscoveryLogEvent, EvalSuiteDiscoveryLoggerPort } from '../discover-conventional-eval-suites/index.js';
import type { LocalEvalsWorkbenchLogEvent, LocalEvalsWorkbenchLoggerPort } from './ports.js';
import { type RuntimeBlockReason } from '../runtime-description.js';

type LogLevel = 'info' | 'warn' | 'error';
type SafeLogEvent = LocalEvalsWorkbenchLogEvent | EvalSuiteDiscoveryLogEvent;

export class SafeConsoleLocalEvalsLogger implements LocalEvalsWorkbenchLoggerPort, EvalSuiteDiscoveryLoggerPort {
  info(event: SafeLogEvent): void {
    writeLog('info', event);
  }

  warn(event: SafeLogEvent): void {
    writeLog('warn', event);
  }

  error(event: LocalEvalsWorkbenchLogEvent): void {
    writeLog('error', event);
  }
}

function writeLog(level: LogLevel, event: SafeLogEvent): void {
  try {
    console.error(JSON.stringify({ level, ...safeEvent(event) }));
  } catch {
    // Diagnostics are best-effort and must not change the operation result.
  }
}

function safeEvent(event: SafeLogEvent): Record<string, unknown> {
  switch (event.event) {
    case 'eval_suite_discovery_started':
      return { event: event.event, stage: 'discovery', outcome: 'started' };
    case 'local_evals_workbench_start_requested':
      return { event: event.event, stage: 'workflow-state', outcome: 'started' };
    case 'eval_suite_discovery_completed':
      return {
        event: event.event,
        stage: 'discovery',
        outcome: event.outcome === 'ready' ? 'completed' : 'blocked',
        suiteCount: safeCount(event.suiteCount),
        diagnosticCount: safeCount(event.diagnosticCount),
        unsupportedCount: safeCount(event.unsupportedCount),
        reasonCodes: event.reasonCodes.filter(isKnownDiscoveryReason).slice(0, 12),
        durationMs: safeCount(event.durationMs),
      };
    case 'local_evals_workbench_state_blocked':
      return { event: event.event, stage: 'workflow-state', outcome: 'blocked', reason: event.reason === 'missing-workflow-state' ? 'missing-workflow-state' : 'invalid-workflow-state' };
    case 'local_evals_workbench_start_failed':
      return { event: event.event, stage: failedStage(event.reason), outcome: 'failed', reason: safeFailureReason(event.reason) };
    case 'local_evals_workbench_request_issue':
      return {
        event: event.event,
        stage: event.stage === 'discovery' ? 'discovery' : event.stage === 'preview' ? 'preview' : event.stage === 'run-start' ? 'run-start' : 'model-check',
        outcome: event.outcome === 'blocked' ? 'blocked' : 'failed',
        reason: event.stage === 'run-start' ? safeStartReason(event.reason)
          : event.stage === 'model-check' || event.stage === 'preview'
          ? (isKnownModelCheckReason(event.reason) ? event.reason : 'unknown')
          : (isKnownPublicDiscoveryReason(event.reason) ? event.reason : 'unknown'),
        reference: safeReference(event.reference),
      };
    case 'local_evals_workbench_run_start_queued':
      return { event: event.event, stage: 'run-start', outcome: 'queued', reference: safeReference(event.reference), runId: safeRunId(event.runId) };
    case 'local_evals_workbench_run_start_response_failed':
      return { event: event.event, stage: 'run-start', outcome: 'uncertain', reason: 'response-write-failed',
        reference: safeReference(event.reference), runId: safeRunId(event.runId) };
    case 'local_evals_workbench_request_started':
    case 'local_evals_workbench_request_completed':
      return { event: event.event, stage: 'preview', outcome: event.outcome, reference: safeReference(event.reference) };
    case 'local_evals_workbench_started':
      return {
        event: event.event,
        stage: 'server-start',
        outcome: 'completed',
        suiteCount: safeCount(event.suiteCount),
        discoveryStatus: event.discoveryStatus === 'ready' ? 'ready' : 'blocked',
      };
  }
}

function failedStage(reason: 'workflow-state-read-failed' | 'discovery-failed' | 'server-start-failed'): string {
  if (reason === 'workflow-state-read-failed') return 'workflow-state';
  if (reason === 'discovery-failed') return 'discovery';
  return 'server-start';
}

function safeFailureReason(reason: string): string {
  if (reason === 'workflow-state-read-failed' || reason === 'discovery-failed' || reason === 'server-start-failed') return reason;
  return 'unknown';
}

function isKnownPublicDiscoveryReason(reason: string): boolean {
  return reason === 'missing-evals-folder' || reason === 'no-eval-suites'
    || reason === 'unreadable-eval-suites' || reason === 'discovery-failed';
}

const knownModelCheckReasons: ReadonlySet<RuntimeBlockReason | 'invalid-request'> = new Set([
  'suite-unavailable', 'runner-unavailable', 'runner-absent', 'runner-start-failed',
  'runner-exited', 'runner-protocol-invalid', 'runner-invalid', 'runner-timeout',
  'environment-missing', 'required-setting-rejected', 'runner-request-too-large',
  'environment-undeclared', 'capability-unsupported', 'model-unavailable',
  'judge-unavailable', 'case-unavailable', 'repeats-invalid', 'artifact-unsafe',
  'artifact-not-ignored', 'artifact-tracked', 'artifact-git-unavailable',
  'artifact-root-unsafe', 'estimate-invalid', 'input-unsafe', 'invalid-request',
]);

function isKnownModelCheckReason(reason: string): boolean {
  return knownModelCheckReasons.has(reason as RuntimeBlockReason | 'invalid-request');
}

const knownStartReasons: ReadonlySet<string> = new Set<string>([
  ...knownModelCheckReasons, 'invalid-input', 'unsafe-path', 'not-ignored', 'tracked-artifacts',
  'git-unavailable', 'unverifiable-root', 'unavailable', 'not-found', 'corrupt',
  'limit-exceeded', 'invalid-transition', 'owner-unknown', 'index-stale',
  'review-stale', 'schedule-failed', 'reference-reused', 'unknown',
]);

function safeStartReason(reason: string): string {
  return knownStartReasons.has(reason) ? reason : 'unknown';
}

function safeRunId(value: string): string | undefined {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value) ? value : undefined;
}

function safeReference(value: string): string | undefined {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)
    ? value.toLowerCase() : undefined;
}

const knownDiscoveryReasons = new Set([
  'evals-folder-missing', 'evals-folder-unreadable', 'discovery-read-failed',
  'suite-file-read-failed', 'suite-definition-malformed', 'suite-definition-unsupported',
  'suite-id-duplicate', 'declared-path-invalid', 'declared-path-unsafe',
  'declared-file-missing', 'declared-file-unreadable', 'sensitive-content-detected',
]);

function isKnownDiscoveryReason(reason: string): boolean {
  return knownDiscoveryReasons.has(reason);
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
