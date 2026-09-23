import { validateModelRouteSelection } from '../model-route-selection.js';
import { isSupportedRouteKey } from '../model-route-contract.js';
import type { SetModelRouteCommand } from './command.js';
import type { SetModelRoutePorts } from './ports.js';
import type { SetModelRouteResult } from './result.js';

export function handleSetModelRoute(command: SetModelRouteCommand, ports: SetModelRoutePorts): SetModelRouteResult {
  if (!isSupportedRouteKey(command)) {
    return { status: 'blocked', recovery: 'Provide a supported route, model, effort, catalog version, and state basis.' };
  }
  const state = ports.stateReader.read();
  if (state.status === 'unavailable') return { status: 'blocked', recovery: 'Run sibu doctor or sibu sync before saving routes.' };
  let catalog;
  try {
    catalog = ports.catalogReader.resolve(command);
  } catch {
    return { status: 'blocked', recovery: 'Restore the Sibu recommendation catalog and resolve again.' };
  }
  const validation = validateModelRouteSelection(command, { ...catalog, stateBasis: state.snapshot.stateBasis }, ports.now());
  if (validation.status === 'blocked') {
    return { status: 'blocked', recovery: 'Provide a supported route, model, effort, catalog version, and state basis.' };
  }
  if (validation.status === 'conflict') return { status: 'conflict', recovery: 'Resolve the route again before saving.' };
  const route = validation.route;
  try {
    const outcome = ports.stateWriter.upsert(route, command.stateBasis);
    if (outcome === 'saved') return { status: 'saved', route, recovery: null };
    return { status: outcome, recovery: outcome === 'conflict' ? 'Resolve the route again before saving.' : 'Retry or use once without saving.' };
  } catch {
    return { status: 'failed', recovery: 'Retry or use once without saving.' };
  }
}
