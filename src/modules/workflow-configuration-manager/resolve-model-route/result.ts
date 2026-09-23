import type { ModelRoute } from '../../../shared/types.js';
import type { RecommendationRead } from '../model-route-contract.js';

export type ResolveModelRouteResult =
  | { status: 'configured'; route: ModelRoute; origin: 'recommended' | 'user-selected' | 'unknown'; guidanceCurrent: boolean; stateBasis: string; catalog: RecommendationRead | null }
  | { status: 'missing'; stateBasis: string; catalog: RecommendationRead }
  | { status: 'workflow-unavailable'; recovery: string }
  | { status: 'unsupported'; recovery: string }
  | { status: 'recommendation-unavailable'; stateBasis: string; recovery: string };
