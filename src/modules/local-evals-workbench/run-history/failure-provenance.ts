import type { DiagnosticLink, FailureProvenance } from './contracts.js';

const code = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value);
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(value);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => Object.keys(value).every(key => allowed.includes(key));

export function validDiagnosticLink(value: unknown): value is DiagnosticLink {
  return object(value) && keys(value, ['code', 'turnId', 'callId']) && code(value.code)
    && (value.turnId === undefined || id(value.turnId)) && (value.callId === undefined || id(value.callId));
}

export function validFailureProvenance(value: unknown): value is FailureProvenance {
  if (!object(value) || !keys(value, ['stage', 'runnerReport', 'processExit', 'protocolRejection'])
    || !['runner-report', 'unexpected-process-exit', 'timeout', 'protocol-rejection'].includes(String(value.stage))) return false;
  if (value.protocolRejection !== undefined) {
    const rejected = value.protocolRejection;
    if (value.stage !== 'protocol-rejection' || !object(rejected)
      || !keys(rejected, ['sequence', 'eventType', 'code', 'byteCount', 'capturedByteCount', 'locator'])
      || !Number.isSafeInteger(rejected.sequence) || Number(rejected.sequence) < 0
      || !code(rejected.eventType) || !code(rejected.code)
      || !Number.isSafeInteger(rejected.byteCount) || Number(rejected.byteCount) < 0
      || !Number.isSafeInteger(rejected.capturedByteCount) || Number(rejected.capturedByteCount) < 0
      || Number(rejected.capturedByteCount) > Number(rejected.byteCount)
      || Number(rejected.capturedByteCount) > 0 && rejected.locator === undefined
      || rejected.locator !== undefined && (typeof rejected.locator !== 'string'
        || !/^[A-Za-z0-9._/-]{1,240}$/.test(rejected.locator)
        || rejected.locator.split('/').some(part => !part || part === '.' || part === '..'))) return false;
  }
  if (value.runnerReport !== undefined && (!object(value.runnerReport) || !keys(value.runnerReport, ['status', 'code'])
    || !['error', 'interrupted'].includes(String(value.runnerReport.status))
    || value.runnerReport.code !== undefined && !code(value.runnerReport.code))) return false;
  if (value.processExit !== undefined && (!object(value.processExit) || !keys(value.processExit, ['code'])
    || !(value.processExit.code === null || Number.isSafeInteger(value.processExit.code) && Number(value.processExit.code) >= 0))) return false;
  if (value.stage === 'runner-report') return value.runnerReport !== undefined;
  if (value.stage === 'unexpected-process-exit') return value.processExit !== undefined && value.runnerReport === undefined;
  return value.runnerReport === undefined && value.processExit === undefined;
}
