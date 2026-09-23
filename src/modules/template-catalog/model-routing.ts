import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ModelReasoningEffort, ModelWorkloadClass, SibuModelRole } from '../../shared/types.js';

export const SIBU_MODEL_ROLES = [
  'implementation-planner',
  'implementation-executor',
  'architecture-reviewer',
  'technical-lead-reviewer',
  'github-exporter',
  'notion-exporter',
] as const;
export const MODEL_WORKLOAD_CLASSES = ['bounded', 'demanding', 'high-risk'] as const;
export const RECOMMENDATION_AGENT_ENVIRONMENTS = ['codex'] as const;
export const MODEL_REASONING_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'] as const;

const CATALOG_VERSION_PATTERN = /^(\d{4}-\d{2}-\d{2})\.([1-9]\d*)$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export type RecommendationAgentEnvironment = (typeof RECOMMENDATION_AGENT_ENVIRONMENTS)[number];
export type { ModelReasoningEffort, ModelWorkloadClass, SibuModelRole } from '../../shared/types.js';

export type ModelRecommendation = Readonly<{
  agentEnvironment: RecommendationAgentEnvironment;
  role: SibuModelRole;
  workloadClass: ModelWorkloadClass;
  model: string;
  reasoningEffort: ModelReasoningEffort;
  rationale: Readonly<{
    expectedFit: string;
    relativeCost: string;
    relativeSpeed: string;
    nonGuarantee: string;
  }>;
}>;

export type ModelRecommendationCatalog = Readonly<{
  schemaVersion: 1;
  catalogVersion: string;
  reviewedAt: string;
  sourceUrls?: readonly string[];
  recommendations: readonly ModelRecommendation[];
}>;

const catalogPath = fileURLToPath(new URL('./model-recommendations.json', import.meta.url));

export function loadModelRecommendationCatalog(): ModelRecommendationCatalog {
  return parseModelRecommendationCatalog(JSON.parse(fs.readFileSync(catalogPath, 'utf8')) as unknown);
}

export function resolveModelRecommendation(
  catalog: ModelRecommendationCatalog,
  key: Pick<ModelRecommendation, 'agentEnvironment' | 'role' | 'workloadClass'>
): ModelRecommendation {
  const recommendation = catalog.recommendations.find(
    (entry) =>
      entry.agentEnvironment === key.agentEnvironment &&
      entry.role === key.role &&
      entry.workloadClass === key.workloadClass
  );

  if (!recommendation) {
    throw new Error(`No model recommendation exists for ${routeKey(key)}.`);
  }

  return recommendation;
}

export function parseModelRecommendationCatalog(value: unknown): ModelRecommendationCatalog {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Model recommendation catalog must use schemaVersion 1.');
  }
  if (!isCatalogVersion(value.catalogVersion) || !isIsoTimestamp(value.reviewedAt)) {
    throw new Error('Model recommendation catalog metadata is invalid.');
  }
  if (value.sourceUrls !== undefined && (!Array.isArray(value.sourceUrls) || !value.sourceUrls.every(isHttpUrl))) {
    throw new Error('Model recommendation catalog sourceUrls must contain valid HTTP URLs.');
  }
  if (!Array.isArray(value.recommendations)) {
    throw new Error('Model recommendation catalog recommendations must be an array.');
  }

  const recommendations = value.recommendations.map(parseRecommendation);
  const keys = recommendations.map(routeKey);
  if (new Set(keys).size !== keys.length) {
    throw new Error('Model recommendation catalog contains duplicate route keys.');
  }

  const expectedKeys = RECOMMENDATION_AGENT_ENVIRONMENTS.flatMap((agentEnvironment) =>
    SIBU_MODEL_ROLES.flatMap((role) =>
      MODEL_WORKLOAD_CLASSES.map((workloadClass) => routeKey({ agentEnvironment, role, workloadClass }))
    )
  );
  const missingKeys = expectedKeys.filter((key) => !keys.includes(key));
  if (missingKeys.length > 0 || recommendations.length !== expectedKeys.length) {
    throw new Error(`Model recommendation catalog mappings are incomplete: ${missingKeys.join(', ') || 'unexpected entries'}.`);
  }

  return Object.freeze({
    schemaVersion: 1,
    catalogVersion: value.catalogVersion,
    reviewedAt: value.reviewedAt,
    ...(value.sourceUrls !== undefined ? { sourceUrls: Object.freeze([...value.sourceUrls]) } : {}),
    recommendations: Object.freeze(recommendations),
  });
}

function parseRecommendation(value: unknown): ModelRecommendation {
  if (!isRecord(value)) throw new Error('Model recommendation entries must be objects.');
  if (!isIncluded(RECOMMENDATION_AGENT_ENVIRONMENTS, value.agentEnvironment)) throw new Error('Unsupported recommendation agent environment.');
  if (!isIncluded(SIBU_MODEL_ROLES, value.role)) throw new Error('Unsupported Sibu model role.');
  if (!isIncluded(MODEL_WORKLOAD_CLASSES, value.workloadClass)) throw new Error('Unsupported model workload class.');
  if (!isNonEmptyString(value.model)) throw new Error('Model recommendation model must be non-empty.');
  if (value.model === 'gpt-6-astra' && value.workloadClass !== 'high-risk') {
    throw new Error('GPT-6 Astra may only be recommended for high-risk work.');
  }
  if (!isIncluded(MODEL_REASONING_EFFORTS, value.reasoningEffort)) throw new Error('Unsupported model reasoning effort.');
  if (!isRecord(value.rationale)) throw new Error('Model recommendation rationale must be an object.');

  const { expectedFit, relativeCost, relativeSpeed, nonGuarantee } = value.rationale;
  if (
    !isNonEmptyString(expectedFit) ||
    !isNonEmptyString(relativeCost) ||
    !isNonEmptyString(relativeSpeed) ||
    !isNonEmptyString(nonGuarantee)
  ) {
    throw new Error('Model recommendation rationale fields must be non-empty strings.');
  }
  if (!/not (?:a )?guarantee/i.test(nonGuarantee)) {
    throw new Error('Model recommendation rationale must explicitly state that it is not a guarantee.');
  }

  return Object.freeze({
    agentEnvironment: value.agentEnvironment,
    role: value.role,
    workloadClass: value.workloadClass,
    model: value.model,
    reasoningEffort: value.reasoningEffort,
    rationale: Object.freeze({ expectedFit, relativeCost, relativeSpeed, nonGuarantee }),
  });
}

function routeKey(key: Pick<ModelRecommendation, 'agentEnvironment' | 'role' | 'workloadClass'>): string {
  return `${key.agentEnvironment}:${key.role}:${key.workloadClass}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
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

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isIncluded<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number]);
}
