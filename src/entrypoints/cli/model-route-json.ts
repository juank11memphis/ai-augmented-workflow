import type { ResolveModelRouteResult } from '../../modules/workflow-configuration-manager/resolve-model-route/result.js';
import type { SetModelRouteResult } from '../../modules/workflow-configuration-manager/set-model-route/result.js';

export function serializeModelRouteResult(result: ResolveModelRouteResult | SetModelRouteResult): string {
  return JSON.stringify({ schemaVersion: 1, ...result });
}
