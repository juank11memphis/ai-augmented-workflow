import { isSupportedRouteKey } from './model-route-contract.js';
import type { ModelRecommendation } from '../template-catalog/model-routing.js';
import type { ModelReasoningEffort, ModelRoute } from '../../shared/types.js';

export type RouteSelection = Readonly<{
  agentEnvironment: string;
  role: string;
  workloadClass: string;
  model: string;
  reasoningEffort: string;
  catalogVersion: string;
  stateBasis: string;
}>;

export type RouteSelectionValidation =
  | { status: 'valid'; route: ModelRoute }
  | { status: 'blocked' }
  | { status: 'conflict' };

const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];

export function validateModelRouteSelection(
  selection: RouteSelection,
  current: Readonly<{ catalogVersion: string; recommendation: ModelRecommendation; stateBasis: string }>,
  selectedAt: string,
): RouteSelectionValidation {
  if (!isSupportedRouteKey(selection) || !isValidModel(selection.model) || !EFFORTS.includes(selection.reasoningEffort) ||
      !selection.catalogVersion || !/^[a-f0-9]{64}$/.test(selection.stateBasis) ||
      !current.recommendation?.model || !current.recommendation.reasoningEffort || !current.catalogVersion) {
    return { status: 'blocked' };
  }
  if (selection.stateBasis !== current.stateBasis || selection.catalogVersion !== current.catalogVersion) {
    return { status: 'conflict' };
  }
  return { status: 'valid', route: {
    agentEnvironment: selection.agentEnvironment,
    role: selection.role,
    workloadClass: selection.workloadClass,
    model: selection.model,
    reasoningEffort: selection.reasoningEffort as ModelReasoningEffort,
    origin: selection.model === current.recommendation.model && selection.reasoningEffort === current.recommendation.reasoningEffort
      ? 'recommended' : 'user-selected',
    catalogVersionAtSelection: current.catalogVersion,
    selectedAt,
  } };
}

function isValidModel(model: string): boolean {
  return typeof model === 'string' && model.length > 0 && model.length <= 128 && model.trim() === model && !/[\x00-\x1f\x7f]/.test(model);
}
