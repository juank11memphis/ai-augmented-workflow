import type { ModelRecommendation } from '../../template-catalog/model-routing.js';
import type { RouteStateRead } from '../model-route-contract.js';

export type ListModelRoutesPorts = Readonly<{
  stateReader: { read(): RouteStateRead };
  catalogReader: { list(): { catalogVersion: string; recommendations: readonly ModelRecommendation[] } };
}>;
