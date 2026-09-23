import type { ModelRecommendation } from '../template-catalog/model-routing.js';
import type { ModelRoute } from '../../shared/types.js';

export type ModelRouteReviewNotice = {
  route: ModelRoute;
  recommendation: ModelRecommendation;
  reasons: readonly string[];
  catalogVersion: string;
  stateBasis: string;
};

export type ModelRouteReviewResult =
  | { status: 'preview'; notices: readonly ModelRouteReviewNotice[]; reviewUnavailable: boolean }
  | { status: 'retained' | 'replaced' | 'later' | 'conflict' | 'failed' | 'unavailable' };
