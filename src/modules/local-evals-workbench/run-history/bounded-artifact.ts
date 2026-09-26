import type { Outcome } from './contracts.js';
import { boundedJson } from './validation.js';

/** Validate finite artifact budgets and shape without modifying accepted content. */
export function boundedArtifact<T>(value: unknown, bytes: number, validate: (value: unknown) => value is T): Outcome<T> {
  if (!boundedJson(value, bytes)) return { status: 'blocked', reason: 'limit-exceeded' };
  if (!validate(value)) return { status: 'blocked', reason: 'invalid-input' };
  return { status: 'ok', value: JSON.parse(JSON.stringify(value)) as T };
}
