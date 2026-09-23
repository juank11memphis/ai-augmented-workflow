import { MODEL_WORKLOAD_CLASSES, RECOMMENDATION_AGENT_ENVIRONMENTS, SIBU_MODEL_ROLES } from '../../template-catalog/model-routing.js';
import type { ModelRoute } from '../../../shared/types.js';
import { isSupportedRouteKey, sameRouteKey } from '../model-route-contract.js';
import type { RouteKey } from '../model-route-contract.js';
import type { ResetModelRoutesCommand } from './command.js';
import type { ResetModelRoutesPorts } from './ports.js';
import type { ResetModelRoutesResult } from './result.js';

export function handleResetModelRoutes(command: ResetModelRoutesCommand, ports: ResetModelRoutesPorts): ResetModelRoutesResult {
  if (!command.confirmed) return { status: 'cancelled', completed: [], recovery: 'No routes were changed.' };
  if (command.scope === 'one' && (!command.key || !isSupportedRouteKey(command.key))) {
    return { status: 'blocked', completed: [], recovery: 'Choose a supported route.' };
  }
  if (command.scope !== 'one' && command.scope !== 'all') {
    return { status: 'blocked', completed: [], recovery: 'Choose one route or all routes.' };
  }
  if (!command.catalogVersion || !/^[a-f0-9]{64}$/.test(command.stateBasis)) {
    return { status: 'blocked', completed: [], recovery: 'Review routes again before resetting.' };
  }
  let catalog;
  try {
    catalog = ports.catalogReader.list();
    const expected = RECOMMENDATION_AGENT_ENVIRONMENTS.length * SIBU_MODEL_ROLES.length * MODEL_WORKLOAD_CLASSES.length;
    if (catalog.catalogVersion !== command.catalogVersion || catalog.recommendations.length !== expected) throw new Error('Catalog changed');
    for (const agentEnvironment of RECOMMENDATION_AGENT_ENVIRONMENTS) {
      for (const role of SIBU_MODEL_ROLES) {
        for (const workloadClass of MODEL_WORKLOAD_CLASSES) {
          const matches = catalog.recommendations.filter((item) => sameRouteKey(item, { agentEnvironment, role, workloadClass }));
          if (matches.length !== 1 || !matches[0].model || !matches[0].reasoningEffort) throw new Error('Invalid catalog');
        }
      }
    }
  } catch {
    return { status: 'blocked', completed: [], recovery: 'Review current recommendations before resetting.' };
  }
  const keys: RouteKey[] = command.scope === 'one' ? [command.key!] : RECOMMENDATION_AGENT_ENVIRONMENTS.flatMap((agentEnvironment) =>
    SIBU_MODEL_ROLES.flatMap((role) => MODEL_WORKLOAD_CLASSES.map((workloadClass) => ({ agentEnvironment, role, workloadClass }))));
  const completed: RouteKey[] = [];
  let expectedBasis = command.stateBasis;
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const state = ports.stateReader.read();
    if (state.status === 'unavailable' || state.snapshot.stateBasis !== expectedBasis) {
      return { status: 'conflict', completed, failed: key, notAttempted: keys.slice(index + 1), recovery: 'Review routes again before retrying.' };
    }
    let current;
    try { current = ports.catalogReader.list(); } catch { current = null; }
    if (!current || current.catalogVersion !== command.catalogVersion) {
      return { status: 'conflict', completed, failed: key, notAttempted: keys.slice(index + 1), recovery: 'Recommendations changed. Review routes again.' };
    }
    const recommendation = current.recommendations.find((item) => sameRouteKey(item, key));
    if (!recommendation?.model || !recommendation.reasoningEffort) {
      return { status: 'failed', completed, failed: key, notAttempted: keys.slice(index + 1), recovery: 'Recommendation is unavailable. Retry after restoring the catalog.' };
    }
    const route: ModelRoute = { ...key, model: recommendation.model, reasoningEffort: recommendation.reasoningEffort,
      origin: 'recommended', catalogVersionAtSelection: current.catalogVersion, selectedAt: ports.now() };
    let outcome: 'saved' | 'conflict' | 'failed';
    try { outcome = ports.stateWriter.upsert(route, expectedBasis); } catch { outcome = 'failed'; }
    if (outcome !== 'saved') {
      return { status: outcome, completed, failed: key, notAttempted: keys.slice(index + 1), recovery: outcome === 'conflict' ? 'Review routes again before retrying.' : 'Retry after checking workflow state.' };
    }
    completed.push(key);
    const after = ports.stateReader.read();
    if (after.status === 'unavailable') {
      return { status: 'failed', completed, failed: null, notAttempted: keys.slice(index + 1), recovery: 'Route was saved but state could not be read. Run sibu doctor.' };
    }
    expectedBasis = after.snapshot.stateBasis;
  }
  return { status: 'completed', completed };
}
