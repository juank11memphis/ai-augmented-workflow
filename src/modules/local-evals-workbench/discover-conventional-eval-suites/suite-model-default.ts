import type { EvalSuiteDiscoveryDiagnostic } from './result.js';

// Match model identities accepted by the runner's describe response.
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;

export function readOptionalSuiteModelDefault(
  value: unknown,
  location: string,
  diagnostics: EvalSuiteDiscoveryDiagnostic[],
): string | undefined {
  return readOptionalModelId(value, location, diagnostics, 'suite-model-default-invalid', 'Suite model default');
}

export function readOptionalCaseModelOverride(
  value: unknown,
  location: string,
  diagnostics: EvalSuiteDiscoveryDiagnostic[],
): string | undefined {
  return readOptionalModelId(value, location, diagnostics, 'case-model-override-invalid', 'Case model override');
}

function readOptionalModelId(
  value: unknown,
  location: string,
  diagnostics: EvalSuiteDiscoveryDiagnostic[],
  reason: string,
  label: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string' && MODEL_ID_PATTERN.test(value)) return value;
  diagnostics.push({
    code: 'suite-definition-malformed',
    reason,
    severity: 'error',
    location,
    message: `${label} must be a non-empty supported model identifier.`,
  });
  return undefined;
}
