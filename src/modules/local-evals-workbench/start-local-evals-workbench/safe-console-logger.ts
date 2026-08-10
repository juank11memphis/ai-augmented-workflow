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
  console.error(JSON.stringify({ level, ...event }));
}
