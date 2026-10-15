import type { EvalSuiteDiscoveryDiagnostic } from './result.js';

// Match model identities accepted by the runner's describe response.
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;

export function readOptionalSuiteModelDefault(
  value: unknown,
  location: string,
  diagnostics: EvalSuiteDiscoveryDiagnostic[],
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && MODEL_ID_PATTERN.test(value)) return value;
  diagnostics.push({
    code: 'suite-definition-malformed',
    reason: 'suite-model-default-invalid',
    severity: 'error',
    location,
    message: 'Suite model default must be a non-empty supported model identifier.',
  });
  return undefined;
}
