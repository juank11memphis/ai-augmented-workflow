import { isSupportedRouteKey, sameRouteKey } from '../model-route-contract.js';
import type { ResolveModelRouteCommand } from './command.js';
import type { ResolveModelRoutePorts } from './ports.js';
import type { ResolveModelRouteResult } from './result.js';

export function handleResolveModelRoute(command: ResolveModelRouteCommand, ports: ResolveModelRoutePorts): ResolveModelRouteResult {
  if (!isSupportedRouteKey(command)) return { status: 'unsupported', recovery: 'Choose a supported agent, Sibu role, and workload class.' };
  const state = ports.stateReader.read();
  if (state.status === 'unavailable') return { status: 'workflow-unavailable', recovery: 'Run sibu init once if needed, then sibu doctor or sibu sync.' };
  const route = state.snapshot.routes.find((item) => sameRouteKey(item, command));
  let catalog;
  try {
    catalog = ports.catalogReader.resolve(command);
    if (!catalog.recommendation?.model || !catalog.recommendation.reasoningEffort || !catalog.catalogVersion) throw new Error('Invalid recommendation');
  } catch {
    if (route) return { status: 'configured', route, origin: 'unknown', guidanceCurrent: false, stateBasis: state.snapshot.stateBasis, catalog: null };
    return { status: 'recommendation-unavailable', stateBasis: state.snapshot.stateBasis, recovery: 'Retry after restoring the Sibu recommendation catalog.' };
  }
  if (!route) return { status: 'missing', stateBasis: state.snapshot.stateBasis, catalog };
  const matches = route.model === catalog.recommendation.model && route.reasoningEffort === catalog.recommendation.reasoningEffort;
  return { status: 'configured', route, origin: matches ? 'recommended' : 'user-selected', guidanceCurrent: matches && route.catalogVersionAtSelection === catalog.catalogVersion, stateBasis: state.snapshot.stateBasis, catalog };
}
