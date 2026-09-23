import type { ModelRoute } from '../../shared/types.js';

export type ModelRouteReviewCommand =
  | { type: 'preview' }
  | { type: 'decide'; choice: 'retain' | 'replace' | 'later'; route: ModelRoute; catalogVersion: string; stateBasis: string };
