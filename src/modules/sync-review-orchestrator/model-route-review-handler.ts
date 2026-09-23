import { compareCatalogVersions, reviewRecommendationSince } from '../template-catalog/index.js';
import { validateModelRouteSelection } from '../workflow-configuration-manager/index.js';
import type { ModelRoute } from '../../shared/types.js';
import type { ModelRouteReviewCommand } from './model-route-review-command.js';
import type { ModelRouteReviewPorts } from './model-route-review-ports.js';
import type { ModelRouteReviewNotice, ModelRouteReviewResult } from './model-route-review-result.js';

function sameRoute(left: ModelRoute, right: ModelRoute): boolean {
  return left.agentEnvironment === right.agentEnvironment && left.role === right.role && left.workloadClass === right.workloadClass &&
    left.model === right.model && left.reasoningEffort === right.reasoningEffort && left.selectedAt === right.selectedAt &&
    left.catalogVersionAtSelection === right.catalogVersionAtSelection;
}

export function handleModelRouteReview(command: ModelRouteReviewCommand, ports: ModelRouteReviewPorts): ModelRouteReviewResult {
  const state = ports.stateReader.read();
  if (state.status === 'unavailable') return { status: 'unavailable' };
  let catalog;
  try { catalog = ports.catalogReader.read(); } catch { return { status: 'unavailable' }; }
  const notices: ModelRouteReviewNotice[] = [];
  let reviewUnavailable = false;
  for (const route of state.snapshot.routes) {
    const marker = state.snapshot.reviews.find((review) =>
      review.agentEnvironment === route.agentEnvironment && review.role === route.role &&
      review.workloadClass === route.workloadClass && review.routeSelectedAt === route.selectedAt);
    const since = marker && compareCatalogVersions(marker.catalogVersion, route.catalogVersionAtSelection) > 0
      ? marker.catalogVersion : route.catalogVersionAtSelection;
    const review = reviewRecommendationSince(catalog, route, since);
    if (review.status === 'unavailable') reviewUnavailable = true;
    if (review.status === 'changed') notices.push({ route, recommendation: review.recommendation, reasons: review.reasons,
      catalogVersion: catalog.catalogVersion, stateBasis: state.snapshot.stateBasis });
  }
  if (command.type === 'preview') return { status: 'preview', notices, reviewUnavailable };
  const notice = notices.find((item) => sameRoute(item.route, command.route));
  if (command.catalogVersion !== catalog.catalogVersion || command.stateBasis !== state.snapshot.stateBasis || !notice) {
    return { status: 'conflict' };
  }
  if (command.choice === 'later') return { status: 'later' };
  if (command.choice === 'retain') {
    const result = ports.stateWriter.retain({ agentEnvironment: command.route.agentEnvironment, role: command.route.role,
      workloadClass: command.route.workloadClass, routeSelectedAt: command.route.selectedAt, catalogVersion: catalog.catalogVersion },
    command.stateBasis);
    return { status: result === 'saved' ? 'retained' : result };
  }
  const selection = {
    agentEnvironment: command.route.agentEnvironment,
    role: command.route.role,
    workloadClass: command.route.workloadClass,
    model: notice.recommendation.model,
    reasoningEffort: notice.recommendation.reasoningEffort,
    catalogVersion: catalog.catalogVersion,
    stateBasis: command.stateBasis,
  };
  const validation = validateModelRouteSelection(selection, { catalogVersion: catalog.catalogVersion,
    recommendation: notice.recommendation, stateBasis: state.snapshot.stateBasis }, ports.now());
  if (validation.status !== 'valid') return { status: validation.status === 'conflict' ? 'conflict' : 'unavailable' };
  try {
    const outcome = ports.routeWriter.replace(validation.route, command.stateBasis);
    return { status: outcome === 'saved' ? 'replaced' : outcome };
  } catch {
    return { status: 'failed' };
  }
}
