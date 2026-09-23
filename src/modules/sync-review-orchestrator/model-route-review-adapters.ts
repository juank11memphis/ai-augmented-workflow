import { loadModelRecommendationCatalog } from '../template-catalog/index.js';
import { readModelRoutes, recordModelRouteReview, upsertModelRoute } from '../workflow-state-ledger/index.js';
import { handleModelRouteReview } from './model-route-review-handler.js';
import type { ModelRouteReviewCommand } from './model-route-review-command.js';

export function reviewProjectModelRoutes(command: ModelRouteReviewCommand, rootPath: string) {
  return handleModelRouteReview(command, {
    catalogReader: { read: loadModelRecommendationCatalog },
    stateReader: { read: () => readModelRoutes(rootPath) },
    stateWriter: { retain: (review, basis) => recordModelRouteReview(rootPath, review, basis) },
    routeWriter: { replace: (route, basis) => upsertModelRoute(rootPath, route, basis) },
    now: () => new Date().toISOString(),
  });
}
