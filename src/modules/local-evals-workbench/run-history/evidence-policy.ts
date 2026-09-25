import type { EvidencePolicy, Outcome } from './contracts.js';
import { boundedJson, record } from './validation.js';
// Internal injection seam: the owner must establish synthetic/redacted provenance.
// Pattern detection alone cannot establish absence of arbitrary production data.
export function evidencePolicy(fields: readonly string[], accepts: (value: unknown) => boolean): EvidencePolicy {
  return { sanitize(value) {
    try {
      function redact(v: unknown): unknown {
        if (Array.isArray(v)) return v.map(redact);
        if (record(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fields.includes(k) ? '[REDACTED]' : redact(x)]));
        return v;
      }
      const safe = redact(value);
      return accepts(safe) ? { status: 'ok', value: safe } : { status: 'blocked', reason: 'policy-rejected' };
    } catch { return { status: 'blocked', reason: 'policy-rejected' }; }
  } };
}
export function sanitize<T>(value: unknown, bytes: number, validate: (value: unknown) => value is T, policy?: EvidencePolicy): Outcome<T> {
  if (!boundedJson(value, bytes)) return { status: 'blocked', reason: 'limit-exceeded' };
  if (!policy) return { status: 'blocked', reason: 'policy-rejected' };
  try {
    const result = policy.sanitize(value);
    if (result.status !== 'ok') return { status: 'blocked', reason: 'policy-rejected' };
    if (!boundedJson(result.value, bytes) || !validate(result.value)) return { status: 'blocked', reason: 'policy-rejected' };
    return { status: 'ok', value: JSON.parse(JSON.stringify(result.value)) as T };
  } catch { return { status: 'blocked', reason: 'policy-rejected' }; }
}
