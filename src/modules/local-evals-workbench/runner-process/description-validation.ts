import { RUNNER_CAPABILITIES, type RuntimeDescription, type RuntimeOutcome } from '../runtime-description.js';
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;
const ENV = /^[A-Z_][A-Z0-9_]*$/;
const CAPABILITIES: readonly string[] = RUNNER_CAPABILITIES;
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function names(value: unknown, pattern: RegExp): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every((entry) => typeof entry === 'string' && pattern.test(entry)) && new Set(value).size === value.length;
}
export function validateDescription(data: unknown, secrets: readonly string[]): RuntimeOutcome<RuntimeDescription> {
  if (!record(data) || typeof data.runnerId !== 'string' || !ID.test(data.runnerId)
    || !names(data.models, ID) || !names(data.judgeModels, ID)
    || !names(data.requiredEnvironment, ENV) || !names(data.capabilities, ID)
    || data.capabilities.some((capability) => !CAPABILITIES.includes(capability))
    || typeof data.costEstimation !== 'boolean') return { status: 'blocked', reason: 'runner-invalid' };
  if (secrets.some((secret) => JSON.stringify(data).includes(secret))) return { status: 'blocked', reason: 'runner-invalid' };
  return { status: 'ready', value: {
    runnerId: data.runnerId,
    capabilities: data.capabilities as RuntimeDescription['capabilities'],
    models: data.models, judgeModels: data.judgeModels,
    requiredEnvironment: data.requiredEnvironment, costEstimation: data.costEstimation,
  } };
}
export function validateEnvelope(event: unknown, requestId: string, type: 'description' | 'estimate'): RuntimeOutcome<unknown> {
  if (!record(event) || event.protocolVersion !== 1 || event.requestId !== requestId
    || event.sequence !== 0 || event.type !== type || event.runId !== null
    || event.caseId !== null || event.attempt !== null || !record(event.data))
    return { status: 'blocked', reason: 'runner-invalid' };
  return { status: 'ready', value: event.data };
}

/** Only a validated, fixed diagnostic code may cross the runner process boundary. */
export function validatedFailureReason(event: unknown, requestId: string): 'runner-request-invalid' | undefined {
  if (!record(event) || event.protocolVersion !== 1 || event.requestId !== requestId
    || event.sequence !== 0 || event.type !== 'run-diagnostic' || event.runId !== null
    || event.caseId !== null || event.attempt !== null || !record(event.data)) return undefined;
  return event.data.code === 'invalid-request' ? 'runner-request-invalid' : undefined;
}
