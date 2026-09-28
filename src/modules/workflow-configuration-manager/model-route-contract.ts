import type { ModelRecommendation } from '../template-catalog/model-routing.js';
import type { ModelRoute, ModelRouteAgentEnvironment, ModelWorkloadClass, SibuModelRole } from '../../shared/types.js';

export type RouteKey = Readonly<{
  agentEnvironment: ModelRouteAgentEnvironment;
  role: SibuModelRole;
  workloadClass: ModelWorkloadClass;
}>;

export type RouteSnapshot = Readonly<{ routes: readonly ModelRoute[]; stateBasis: string }>;
export type RouteStateRead = { status: 'available'; snapshot: RouteSnapshot } | { status: 'unavailable' };
export type RecommendationRead = Readonly<{ catalogVersion: string; recommendation: ModelRecommendation }>;

export function isSupportedRouteKey(key: { agentEnvironment: unknown; role: unknown; workloadClass: unknown }): key is RouteKey {
  return key.agentEnvironment === 'codex' &&
    ['implementation-planner', 'implementation-executor', 'architecture-reviewer', 'github-exporter', 'notion-exporter'].includes(String(key.role)) &&
    ['bounded', 'demanding', 'high-risk'].includes(String(key.workloadClass));
}

export function sameRouteKey(left: RouteKey, right: RouteKey): boolean {
  return left.agentEnvironment === right.agentEnvironment && left.role === right.role && left.workloadClass === right.workloadClass;
}
