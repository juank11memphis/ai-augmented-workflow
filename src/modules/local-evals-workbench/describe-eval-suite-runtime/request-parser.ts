import type { DescribeEvalSuiteRuntimeCommand } from './command.js';
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
export function parseDescribeRequest(value: unknown): DescribeEvalSuiteRuntimeCommand | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => key !== 'suiteId')) return undefined;
  return typeof candidate.suiteId === 'string' && ID.test(candidate.suiteId) ? { suiteId: candidate.suiteId } : undefined;
}
