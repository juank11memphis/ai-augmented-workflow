import type { ModelRoute } from '../../../shared/types.js';
import type { ModelRecommendation } from '../../template-catalog/model-routing.js';

export type ModelRouteListItem = Readonly<{
  recommendation: ModelRecommendation;
  route: ModelRoute | null;
  status: 'not-configured' | 'recommended' | 'user-selected';
  reviewNeeded: boolean;
}>;

export type ListModelRoutesResult =
  | { status: 'listed'; routes: readonly ModelRouteListItem[]; catalogVersion: string; stateBasis: string }
  | { status: 'workflow-unavailable'; recovery: string }
  | { status: 'recommendation-unavailable'; savedRoutes: readonly ModelRoute[]; recovery: string };
