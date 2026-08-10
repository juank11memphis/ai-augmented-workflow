import type { LocalEvalsWorkbenchLogEvent, LocalEvalsWorkbenchLoggerPort } from './ports.js';

type LogLevel = 'info' | 'warn' | 'error';

export class SafeConsoleLocalEvalsLogger implements LocalEvalsWorkbenchLoggerPort {
  info(event: LocalEvalsWorkbenchLogEvent): void {
    writeLog('info', event);
  }

  warn(event: LocalEvalsWorkbenchLogEvent): void {
    writeLog('warn', event);
  }

  error(event: LocalEvalsWorkbenchLogEvent): void {
    writeLog('error', event);
  }
}

function writeLog(level: LogLevel, event: LocalEvalsWorkbenchLogEvent): void {
  console.error(JSON.stringify({ level, ...event }));
}
