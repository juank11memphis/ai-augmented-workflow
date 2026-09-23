import type {
  ModelReasoningEffort,
  ModelRoute,
  ModelRouteReview,
  ModelRouteAgentEnvironment,
  ModelRouteOrigin,
  ModelWorkloadClass,
  SibuModelRole,
} from '../../shared/types.js';

const AGENT_ENVIRONMENTS: readonly ModelRouteAgentEnvironment[] = ['codex'];
const SIBU_ROLES: readonly SibuModelRole[] = [
  'implementation-planner',
  'implementation-executor',
  'architecture-reviewer',
  'technical-lead-reviewer',
  'github-exporter',
  'notion-exporter',
];
const WORKLOAD_CLASSES: readonly ModelWorkloadClass[] = ['bounded', 'demanding', 'high-risk'];
const REASONING_EFFORTS: readonly ModelReasoningEffort[] = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const ORIGINS: readonly ModelRouteOrigin[] = ['recommended', 'user-selected'];
const CATALOG_VERSION_PATTERN = /^(\d{4}-\d{2}-\d{2})\.([1-9]\d*)$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function isModelRoutes(value: unknown): value is ModelRoute[] {
  if (!Array.isArray(value) || !value.every(isModelRoute)) {
    return false;
  }

  const keys = value.map(routeKey);
  return new Set(keys).size === keys.length;
}

export function isModelRouteReviews(value: unknown): value is ModelRouteReview[] {
  if (!Array.isArray(value) || !value.every((review) =>
    !!review && typeof review === 'object' &&
    isIncluded(AGENT_ENVIRONMENTS, review.agentEnvironment) &&
    isIncluded(SIBU_ROLES, review.role) && isIncluded(WORKLOAD_CLASSES, review.workloadClass) &&
    isIsoTimestamp(review.routeSelectedAt) && isCatalogVersion(review.catalogVersion))) return false;
  return new Set(value.map(routeKey)).size === value.length;
}

function isModelRoute(value: unknown): value is ModelRoute {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const route = value as Partial<ModelRoute>;

  return (
    isIncluded(AGENT_ENVIRONMENTS, route.agentEnvironment) &&
    isIncluded(SIBU_ROLES, route.role) &&
    isIncluded(WORKLOAD_CLASSES, route.workloadClass) &&
    isNonEmptyString(route.model) &&
    isIncluded(REASONING_EFFORTS, route.reasoningEffort) &&
    isIncluded(ORIGINS, route.origin) &&
    isCatalogVersion(route.catalogVersionAtSelection) &&
    isIsoTimestamp(route.selectedAt)
  );
}

function routeKey(route: ModelRoute | ModelRouteReview): string {
  return `${route.agentEnvironment}:${route.role}:${route.workloadClass}`;
}

function isIncluded<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number]);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isCatalogVersion(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = CATALOG_VERSION_PATTERN.exec(value);
  if (!match) return false;

  const versionDate = new Date(`${match[1]}T00:00:00.000Z`);
  return !Number.isNaN(versionDate.getTime()) && versionDate.toISOString().slice(0, 10) === match[1];
}
