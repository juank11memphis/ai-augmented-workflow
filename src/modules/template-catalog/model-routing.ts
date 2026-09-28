import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { ModelReasoningEffort, ModelWorkloadClass, SibuModelRole } from '../../shared/types.js';

export const SIBU_MODEL_ROLES = [
  'implementation-planner',
  'implementation-executor',
  'architecture-reviewer',
  'github-exporter',
  'notion-exporter',
] as const;
export const MODEL_WORKLOAD_CLASSES = ['bounded', 'demanding', 'high-risk'] as const;
export const RECOMMENDATION_AGENT_ENVIRONMENTS = ['codex'] as const;
export const MODEL_REASONING_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'] as const;

const CATALOG_VERSION_PATTERN = /^(\d{4}-\d{2}-\d{2})\.([1-9]\d*)$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HISTORY_BASE_VERSION = '2026-09-23.2';
const HISTORY_BASE_SHA256 = '6e829c04a1a6cee39a51f3dbfb3f436096980367327af6f57c93ee5e57ec8e04';

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
  historyBaseVersion: string;
  historyBaseRecommendations: readonly ModelRecommendation[];
  releases: readonly RecommendationRelease[];
}>;

export type RecommendationRelease = Readonly<{
  version: string;
  changes: readonly RecommendationChange[];
}>;

export type RecommendationChange = Readonly<{
  agentEnvironment: RecommendationAgentEnvironment;
  role: SibuModelRole;
  workloadClass: ModelWorkloadClass;
  before: Readonly<Pick<ModelRecommendation, 'model' | 'reasoningEffort' | 'rationale'>>;
  after: Readonly<Pick<ModelRecommendation, 'model' | 'reasoningEffort' | 'rationale'>>;
  reason: string;
}>;

export type RecommendationReview =
  | { status: 'unchanged' }
  | { status: 'unavailable' }
  | { status: 'changed'; recommendation: ModelRecommendation; reasons: readonly string[] };

export function compareCatalogVersions(left: string, right: string): number {
  if (!isCatalogVersion(left) || !isCatalogVersion(right)) throw new Error('Invalid model recommendation catalog version.');
  const [leftDay, leftRevision] = left.split('.');
  const [rightDay, rightRevision] = right.split('.');
  if (leftDay !== rightDay) return leftDay < rightDay ? -1 : 1;
  const leftNumber = BigInt(leftRevision);
  const rightNumber = BigInt(rightRevision);
  return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0;
}

export function reviewRecommendationSince(
  catalog: ModelRecommendationCatalog,
  key: Pick<ModelRecommendation, 'agentEnvironment' | 'role' | 'workloadClass'>,
  savedVersion: string
): RecommendationReview {
  if (!isCatalogVersion(savedVersion) || compareCatalogVersions(savedVersion, catalog.historyBaseVersion) < 0 ||
      compareCatalogVersions(savedVersion, catalog.catalogVersion) > 0 ||
      (savedVersion !== catalog.historyBaseVersion && !catalog.releases.some((release) => release.version === savedVersion))) {
    return { status: 'unavailable' };
  }
  const changes = catalog.releases
    .filter((release) => compareCatalogVersions(release.version, savedVersion) > 0)
    .flatMap((release) => release.changes.filter((change) => routeKey(change) === routeKey(key)));
  if (changes.length === 0) return { status: 'unchanged' };
  const recommendation = resolveModelRecommendation(catalog, key);
  if (JSON.stringify(changes[0].before) === JSON.stringify(pickGuidance(recommendation))) return { status: 'unchanged' };
  return { status: 'changed', recommendation, reasons: changes.map((change) => change.reason) };
}

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

  if (!isCatalogVersion(value.historyBaseVersion) || compareCatalogVersions(value.historyBaseVersion, value.catalogVersion) > 0 || !Array.isArray(value.releases)) {
    throw new Error('Model recommendation catalog release history is invalid.');
  }
  if (!Array.isArray(value.historyBaseRecommendations)) {
    throw new Error('Model recommendation history base must contain every route.');
  }
  const historyBaseRecommendations = value.historyBaseRecommendations.map(parseRecommendation);
  const baseKeys = historyBaseRecommendations.map(routeKey);
  if (new Set(baseKeys).size !== baseKeys.length || baseKeys.length !== expectedKeys.length ||
      expectedKeys.some((key) => !baseKeys.includes(key))) {
    throw new Error('Model recommendation history base has duplicate or incomplete route mappings.');
  }
  const baseDigest = createHash('sha256').update(JSON.stringify(historyBaseRecommendations)).digest('hex');
  if (value.historyBaseVersion !== HISTORY_BASE_VERSION || baseDigest !== HISTORY_BASE_SHA256) {
    throw new Error('Model recommendation history base must remain fixed across releases.');
  }
  const baseByKey = new Map(historyBaseRecommendations.map((entry) => [routeKey(entry), entry]));
  const releases = value.releases.map(parseRelease);
  let previousVersion = value.historyBaseVersion;
  for (const release of releases) {
    if (compareCatalogVersions(release.version, previousVersion) <= 0 ||
        compareCatalogVersions(release.version, value.catalogVersion) > 0) throw new Error('Model recommendation releases must be ordered.');
    const [previousDay, previousSequence] = previousVersion.split('.');
    const [releaseDay, releaseSequence] = release.version.split('.');
    if (releaseDay === previousDay && BigInt(releaseSequence) !== BigInt(previousSequence) + 1n) {
      throw new Error('Model recommendation release history has a version gap.');
    }
    previousVersion = release.version;
  }
  if (previousVersion !== value.catalogVersion) throw new Error('Model recommendation release history does not reach the current catalog.');
  for (const recommendation of recommendations) {
    const base = baseByKey.get(routeKey(recommendation));
    if (!base) throw new Error('Model recommendation history base is incomplete.');
    const changes = releases.flatMap((release) => release.changes.filter((change) => routeKey(change) === routeKey(recommendation)));
    let guidance = pickGuidance(base);
    for (const change of changes) {
      if (JSON.stringify(guidance) !== JSON.stringify(change.before)) throw new Error('Model recommendation change chain is inconsistent.');
      guidance = change.after;
    }
    if (JSON.stringify(guidance) !== JSON.stringify(pickGuidance(recommendation))) {
      throw new Error('Model recommendation release history does not match current guidance.');
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    catalogVersion: value.catalogVersion,
    reviewedAt: value.reviewedAt,
    ...(value.sourceUrls !== undefined ? { sourceUrls: Object.freeze([...value.sourceUrls]) } : {}),
    recommendations: Object.freeze(recommendations),
    historyBaseVersion: value.historyBaseVersion,
    historyBaseRecommendations: Object.freeze(historyBaseRecommendations),
    releases: Object.freeze(releases),
  });
}

function parseRelease(value: unknown): RecommendationRelease {
  if (!isRecord(value) || !isCatalogVersion(value.version) || !Array.isArray(value.changes)) throw new Error('Invalid model recommendation release.');
  const changes = value.changes.map(parseChange);
  if (new Set(changes.map(routeKey)).size !== changes.length) throw new Error('Duplicate route change in release.');
  return Object.freeze({ version: value.version, changes: Object.freeze(changes) });
}

function parseChange(value: unknown): RecommendationChange {
  if (!isRecord(value) || !isIncluded(RECOMMENDATION_AGENT_ENVIRONMENTS, value.agentEnvironment) ||
      !isIncluded(SIBU_MODEL_ROLES, value.role) || !isIncluded(MODEL_WORKLOAD_CLASSES, value.workloadClass) ||
      !isNonEmptyString(value.reason)) throw new Error('Invalid route-scoped recommendation change note.');
  const before = parseGuidance(value.before);
  const after = parseGuidance(value.after);
  if (JSON.stringify(before) === JSON.stringify(after)) throw new Error('Unchanged guidance must not be recorded as a route change.');
  return Object.freeze({ agentEnvironment: value.agentEnvironment, role: value.role, workloadClass: value.workloadClass,
    before, after, reason: value.reason });
}

function parseGuidance(value: unknown): RecommendationChange['before'] {
  if (!isRecord(value) || !isNonEmptyString(value.model) || !isIncluded(MODEL_REASONING_EFFORTS, value.reasoningEffort) || !isRecord(value.rationale)) {
    throw new Error('Invalid recommendation change guidance.');
  }
  const { expectedFit, relativeCost, relativeSpeed, nonGuarantee } = value.rationale;
  if (![expectedFit, relativeCost, relativeSpeed, nonGuarantee].every(isNonEmptyString) || !/not (?:a )?guarantee/i.test(nonGuarantee as string)) {
    throw new Error('Invalid recommendation change rationale.');
  }
  return { model: value.model, reasoningEffort: value.reasoningEffort,
    rationale: { expectedFit: expectedFit as string, relativeCost: relativeCost as string,
      relativeSpeed: relativeSpeed as string, nonGuarantee: nonGuarantee as string } };
}

function pickGuidance(value: ModelRecommendation): RecommendationChange['after'] {
  return { model: value.model, reasoningEffort: value.reasoningEffort, rationale: value.rationale };
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
