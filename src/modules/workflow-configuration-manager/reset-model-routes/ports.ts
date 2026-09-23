import type { ModelRoute } from '../../../shared/types.js';
import type { ModelRecommendation } from '../../template-catalog/model-routing.js';
import type { RouteStateRead } from '../model-route-contract.js';

export type ResetModelRoutesPorts = Readonly<{
  stateReader: { read(): RouteStateRead };
  catalogReader: { list(): { catalogVersion: string; recommendations: readonly ModelRecommendation[] } };
  stateWriter: { upsert(route: ModelRoute, expectedBasis: string): 'saved' | 'conflict' | 'failed' };
  now: () => string;
}>;
