import type { ModelRecommendationCatalog } from '../template-catalog/index.js';
import type { LedgerRouteRead } from '../workflow-state-ledger/index.js';
import type { ModelRoute, ModelRouteReview } from '../../shared/types.js';

export type ModelRouteReviewPorts = {
  catalogReader: { read(): ModelRecommendationCatalog };
  stateReader: { read(): LedgerRouteRead };
  stateWriter: { retain(review: ModelRouteReview, basis: string): 'saved' | 'conflict' | 'failed' };
  routeWriter: { replace(route: ModelRoute, basis: string): 'saved' | 'conflict' | 'failed' };
  now(): string;
};
