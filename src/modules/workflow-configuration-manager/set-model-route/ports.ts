import type { ModelRoute } from '../../../shared/types.js';
import type { RouteKey, RouteStateRead, RecommendationRead } from '../model-route-contract.js';

export type SetModelRoutePorts = Readonly<{
  stateReader: { read(): RouteStateRead };
  catalogReader: { resolve(key: RouteKey): RecommendationRead };
  stateWriter: { upsert(route: ModelRoute, expectedBasis: string): 'saved' | 'conflict' | 'failed' };
  now: () => string;
}>;
