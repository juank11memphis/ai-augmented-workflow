import { MODEL_WORKLOAD_CLASSES, RECOMMENDATION_AGENT_ENVIRONMENTS, SIBU_MODEL_ROLES } from '../../template-catalog/model-routing.js';
import { sameRouteKey } from '../model-route-contract.js';
import type { ListModelRoutesCommand } from './command.js';
import type { ListModelRoutesPorts } from './ports.js';
import type { ListModelRoutesResult, ModelRouteListItem } from './result.js';

export function handleListModelRoutes(_command: ListModelRoutesCommand, ports: ListModelRoutesPorts): ListModelRoutesResult {
  const state = ports.stateReader.read();
  if (state.status === 'unavailable') return { status: 'workflow-unavailable', recovery: 'Run sibu doctor or sibu sync before managing routes.' };
  let catalog;
  try {
    catalog = ports.catalogReader.list();
    const expected = RECOMMENDATION_AGENT_ENVIRONMENTS.length * SIBU_MODEL_ROLES.length * MODEL_WORKLOAD_CLASSES.length;
    if (!catalog.catalogVersion || catalog.recommendations.length !== expected) throw new Error('Incomplete catalog');
  } catch {
    return { status: 'recommendation-unavailable', savedRoutes: state.snapshot.routes,
      recovery: 'Restore the Sibu recommendation catalog before changing routes.' };
  }
  const routes: ModelRouteListItem[] = [];
  for (const agentEnvironment of RECOMMENDATION_AGENT_ENVIRONMENTS) {
    for (const role of SIBU_MODEL_ROLES) {
      for (const workloadClass of MODEL_WORKLOAD_CLASSES) {
        const recommendation = catalog.recommendations.find((item) => sameRouteKey(item, { agentEnvironment, role, workloadClass }));
        if (!recommendation?.model || !recommendation.reasoningEffort) {
          return { status: 'recommendation-unavailable', savedRoutes: state.snapshot.routes,
            recovery: 'Restore the Sibu recommendation catalog before changing routes.' };
        }
        const route = state.snapshot.routes.find((item) => sameRouteKey(item, recommendation)) ?? null;
        const matches = route?.model === recommendation.model && route.reasoningEffort === recommendation.reasoningEffort;
        routes.push({ recommendation, route, status: !route ? 'not-configured' : matches ? 'recommended' : 'user-selected', reviewNeeded: !!route && route.catalogVersionAtSelection !== catalog.catalogVersion });
      }
    }
  }
  return { status: 'listed', routes, catalogVersion: catalog.catalogVersion, stateBasis: state.snapshot.stateBasis };
}
