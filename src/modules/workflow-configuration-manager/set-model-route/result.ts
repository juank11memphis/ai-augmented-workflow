import type { ModelRoute } from '../../../shared/types.js';

export type SetModelRouteResult =
  | { status: 'saved'; route: ModelRoute; recovery: null }
  | { status: 'blocked' | 'conflict' | 'failed'; recovery: string };
