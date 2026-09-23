import { isSupportedRouteKey } from '../model-route-contract.js';
import type { SetModelRouteCommand } from './command.js';
import type { SetModelRoutePorts } from './ports.js';
import type { SetModelRouteResult } from './result.js';
import type { ModelReasoningEffort, ModelRoute } from '../../../shared/types.js';

const EFFORTS: readonly string[] = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];

export function handleSetModelRoute(command: SetModelRouteCommand, ports: SetModelRoutePorts): SetModelRouteResult {
  if (!isSupportedRouteKey(command) || !isValidModel(command.model) || !EFFORTS.includes(command.reasoningEffort) ||
      !command.catalogVersion || !/^[a-f0-9]{64}$/.test(command.stateBasis)) {
    return { status: 'blocked', recovery: 'Provide a supported route, model, effort, catalog version, and state basis.' };
  }
  const state = ports.stateReader.read();
  if (state.status === 'unavailable') return { status: 'blocked', recovery: 'Run sibu doctor or sibu sync before saving routes.' };
  if (state.snapshot.stateBasis !== command.stateBasis) return { status: 'conflict', recovery: 'Resolve the route again before saving.' };
  let catalog;
  try {
    catalog = ports.catalogReader.resolve(command);
    if (!catalog.recommendation?.model || !catalog.recommendation.reasoningEffort || !catalog.catalogVersion) throw new Error('Invalid recommendation');
  } catch {
    return { status: 'blocked', recovery: 'Restore the Sibu recommendation catalog and resolve again.' };
  }
  if (catalog.catalogVersion !== command.catalogVersion) return { status: 'conflict', recovery: 'Resolve the route again before saving.' };
  const route: ModelRoute = {
    agentEnvironment: command.agentEnvironment,
    role: command.role,
    workloadClass: command.workloadClass,
    model: command.model,
    reasoningEffort: command.reasoningEffort as ModelReasoningEffort,
    origin: command.model === catalog.recommendation.model && command.reasoningEffort === catalog.recommendation.reasoningEffort ? 'recommended' : 'user-selected',
    catalogVersionAtSelection: catalog.catalogVersion,
    selectedAt: ports.now(),
  };
  try {
    const outcome = ports.stateWriter.upsert(route, command.stateBasis);
    if (outcome === 'saved') return { status: 'saved', route, recovery: null };
    return { status: outcome, recovery: outcome === 'conflict' ? 'Resolve the route again before saving.' : 'Retry or use once without saving.' };
  } catch {
    return { status: 'failed', recovery: 'Retry or use once without saving.' };
  }
}

function isValidModel(model: string): boolean {
  return typeof model === 'string' && model.length > 0 && model.length <= 128 && model.trim() === model && !/[\x00-\x1f\x7f]/.test(model);
}
