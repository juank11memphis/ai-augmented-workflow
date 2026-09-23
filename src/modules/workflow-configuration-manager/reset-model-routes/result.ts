import type { RouteKey } from '../model-route-contract.js';

export type ResetModelRoutesResult =
  | { status: 'completed'; completed: readonly RouteKey[] }
  | { status: 'cancelled' | 'blocked'; completed: readonly RouteKey[]; recovery: string }
  | { status: 'conflict' | 'failed'; completed: readonly RouteKey[]; failed: RouteKey | null; notAttempted: readonly RouteKey[]; recovery: string };
