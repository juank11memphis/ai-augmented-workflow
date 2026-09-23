import { loadModelRecommendationCatalog, resolveModelRecommendation } from '../template-catalog/model-routing.js';
import { readModelRoutes, upsertModelRoute } from '../workflow-state-ledger/index.js';
import { handleResolveModelRoute } from './resolve-model-route/handler.js';
import type { ResolveModelRouteCommand } from './resolve-model-route/command.js';
import { handleSetModelRoute } from './set-model-route/handler.js';
import type { SetModelRouteCommand } from './set-model-route/command.js';
import type { RouteKey } from './model-route-contract.js';

function readRecommendation(key: RouteKey) {
  const catalog = loadModelRecommendationCatalog();
  return { catalogVersion: catalog.catalogVersion, recommendation: resolveModelRecommendation(catalog, key) };
}

export function resolveProjectModelRoute(command: ResolveModelRouteCommand, rootPath: string) {
  return handleResolveModelRoute(command, {
    stateReader: { read: () => readModelRoutes(rootPath) },
    catalogReader: { resolve: readRecommendation },
  });
}

export function setProjectModelRoute(command: SetModelRouteCommand, rootPath: string) {
  return handleSetModelRoute(command, {
    stateReader: { read: () => readModelRoutes(rootPath) },
    catalogReader: { resolve: readRecommendation },
    stateWriter: { upsert: (route, expectedBasis) => upsertModelRoute(rootPath, route, expectedBasis) },
    now: () => new Date().toISOString(),
  });
}
