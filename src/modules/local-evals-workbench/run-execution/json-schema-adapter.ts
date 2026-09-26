import { Ajv, type ErrorObject } from 'ajv';
import type { JsonValue } from '../discover-conventional-eval-suites/index.js';

export type SchemaResult = { readonly status: 'valid' | 'failed' | 'invalid-schema'; readonly diagnostics: readonly string[] };

const SUPPORTED_KEYWORDS = new Set([
  'type', 'properties', 'required', 'items', 'additionalProperties', 'enum', 'const',
  'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems',
]);
const MAX_SCHEMA_DEPTH = 12;

function supportedSchema(schema: unknown, depth = 0): boolean {
  if (depth > MAX_SCHEMA_DEPTH) return false;
  if (typeof schema === 'boolean') return true;
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return false;

  for (const [keyword, value] of Object.entries(schema)) {
    if (!SUPPORTED_KEYWORDS.has(keyword)) return false;
    if (keyword === 'properties') {
      if (value === null || typeof value !== 'object' || Array.isArray(value)
        || !Object.values(value).every(child => supportedSchema(child, depth + 1))) return false;
    } else if (keyword === 'items') {
      if (Array.isArray(value)
        ? !value.every(child => supportedSchema(child, depth + 1))
        : !supportedSchema(value, depth + 1)) return false;
    } else if (keyword === 'additionalProperties' && !supportedSchema(value, depth + 1)) return false;
    // enum and const are literal data: their keys must not be treated as schema keywords.
  }
  return true;
}

/** Basic Draft-07 subset only. No references, regex rules, remote loader, or data mutation. */
export function validateJsonSchema(schema: JsonValue, actual: JsonValue): SchemaResult {
  if (schema === null || typeof schema !== 'boolean' && (typeof schema !== 'object' || Array.isArray(schema))
    || Buffer.byteLength(JSON.stringify(schema)) > 32_768 || !supportedSchema(schema)) {
    return { status: 'invalid-schema', diagnostics: ['unsupported-schema'] };
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false, coerceTypes: false, removeAdditional: false, useDefaults: false, validateFormats: false });
    const validate = ajv.compile(schema);
    if (validate(actual)) return { status: 'valid', diagnostics: [] };
    return { status: 'failed', diagnostics: (validate.errors ?? []).slice(0, 8).map((error: ErrorObject) => `${error.instancePath.slice(0, 80) || '/'}:${error.keyword}`) };
  } catch { return { status: 'invalid-schema', diagnostics: ['invalid-schema'] }; }
}
