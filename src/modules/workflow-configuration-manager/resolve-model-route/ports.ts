import type { RouteKey, RouteStateRead, RecommendationRead } from '../model-route-contract.js';

export type ResolveModelRoutePorts = Readonly<{
  stateReader: { read(): RouteStateRead };
  catalogReader: { resolve(key: RouteKey): RecommendationRead };
}>;
