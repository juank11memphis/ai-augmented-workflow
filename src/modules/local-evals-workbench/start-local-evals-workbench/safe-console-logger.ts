import type { EvalSuiteDiscoveryLogEvent, EvalSuiteDiscoveryLoggerPort } from '../discover-conventional-eval-suites/index.js';
import type { LocalEvalsWorkbenchLogEvent, LocalEvalsWorkbenchLoggerPort } from './ports.js';

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
  console.error(JSON.stringify({ level, ...safeEvent(event) }));
}

function safeEvent(event: SafeLogEvent): SafeLogEvent {
  switch (event.event) {
    case 'eval_suite_discovery_started':
    case 'local_evals_workbench_start_requested':
      return { event: event.event };
    case 'eval_suite_discovery_completed':
      return {
        event: event.event,
        outcome: event.outcome,
        suiteCount: safeCount(event.suiteCount),
        diagnosticCount: safeCount(event.diagnosticCount),
        unsupportedCount: safeCount(event.unsupportedCount),
        reasonCodes: event.reasonCodes.filter((reason) => /^[a-z0-9-]+$/.test(reason)).slice(0, 50),
        durationMs: safeCount(event.durationMs),
      };
    case 'local_evals_workbench_state_blocked':
      return { event: event.event, reason: event.reason };
    case 'local_evals_workbench_start_failed':
      return { event: event.event, reason: event.reason };
    case 'local_evals_workbench_started':
      return {
        event: event.event,
        host: event.host,
        port: safeCount(event.port),
        suiteCount: safeCount(event.suiteCount),
        discoveryStatus: event.discoveryStatus,
      };
  }
}

function safeCount(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
