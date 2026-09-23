import fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '../../shared/hash.js';
import type { ModelRoute, SibuState } from '../../shared/types.js';
import { isModelRoutes } from './model-routes.js';
import { STATE_RELATIVE_PATH } from './state-path.js';
import { isSibuState } from './state.js';
import { mutateStateFile } from './state-mutation.js';

export type LedgerRouteRead = { status: 'available'; snapshot: { routes: ModelRoute[]; stateBasis: string } } | { status: 'unavailable' };

export function readModelRoutes(rootPath: string): LedgerRouteRead {
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);
  try {
    if (!fs.statSync(statePath).isFile() || fs.lstatSync(statePath).isSymbolicLink()) return { status: 'unavailable' };
    const bytes = fs.readFileSync(statePath, 'utf8');
    const state = JSON.parse(bytes) as unknown;
    if (!isSibuState(state)) return { status: 'unavailable' };
    return { status: 'available', snapshot: { routes: state.modelRoutes ?? [], stateBasis: sha256(bytes) } };
  } catch {
    return { status: 'unavailable' };
  }
}

export function upsertModelRoute(rootPath: string, route: ModelRoute, expectedBasis: string): 'saved' | 'conflict' | 'failed' {
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);
  try {
    return mutateStateFile(statePath, (current) => {
      if (!current) return { result: 'failed' as const };
      if (sha256(current.bytes) !== expectedBasis) return { result: 'conflict' as const };
      const routes = current.state.modelRoutes ?? [];
      const nextRoutes = [...routes.filter((item) => !sameKey(item, route)), route];
      if (!isModelRoutes(nextRoutes)) return { result: 'failed' as const };
      const next: SibuState = { ...current.state, modelRoutes: nextRoutes, updatedAt: new Date().toISOString() };
      return { state: next, result: 'saved' as const };
    });
  } catch {
    return 'failed';
  }
}

function sameKey(left: ModelRoute, right: ModelRoute): boolean {
  return left.agentEnvironment === right.agentEnvironment && left.role === right.role && left.workloadClass === right.workloadClass;
}
