import { validateProjectFileTargets } from './project-file-safety.js';
import { UnsafeRepairProposalTargetError } from './proposal-validation.js';
import { buildRepairProposalPrompt } from './prompt-builder.js';
import type { RepairProposalDraft, RepairProposalLlmPort } from './ports.js';
import { ProposalProviderFailure } from './ports.js';

const MAX_PROVIDER_RESPONSE_BYTES = 128 * 1024;
const MAX_PROPOSAL_BYTES = 64 * 1024;
const PROVIDER_TIMEOUT_MS = 15_000;

export type OpenAiRepairProposalClient = {
  createResponse(request: { readonly model: string; readonly input: string; readonly apiKey: string }): Promise<{ readonly outputText: string }>;
};

export class FetchOpenAiRepairProposalClient implements OpenAiRepairProposalClient {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch, private readonly timeoutMs = PROVIDER_TIMEOUT_MS) {}

  async createResponse(request: { readonly model: string; readonly input: string }): Promise<{ readonly outputText: string }> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    try {
      const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: request.model, input: request.input }), signal: controller.signal,
      });
      if (!response.ok) throw new ProposalProviderFailure(classifyStatus(response.status));
      const body = await readBoundedResponse(response);
      let payload: unknown;
      try { payload = JSON.parse(body) as unknown; }
      catch { throw new ProposalProviderFailure('invalid-llm-response'); }
      return { outputText: extractOutputText(payload) };
    } catch (error) {
      if (timedOut) throw new ProposalProviderFailure('provider-timeout');
      if (error instanceof ProposalProviderFailure) throw error;
      throw new Error('OpenAI repair proposal request failed.');
    } finally { clearTimeout(timer); }
  }
}

export class OpenAiRepairProposalAdapter implements RepairProposalLlmPort {
  constructor(private readonly apiKey: string, private readonly client: OpenAiRepairProposalClient = new FetchOpenAiRepairProposalClient(apiKey)) {}

  async draftProposal(request: Parameters<RepairProposalLlmPort['draftProposal']>[0]): Promise<RepairProposalDraft> {
    const prompt = buildRepairProposalPrompt(request);
    const response = await this.client.createResponse({ model: request.model, input: prompt, apiKey: this.apiKey });
    return parseRepairProposalDraft(response.outputText);
  }
}

export function parseRepairProposalDraft(outputText: string): RepairProposalDraft {
  if (Buffer.byteLength(outputText, 'utf8') > MAX_PROPOSAL_BYTES) throw new ProposalProviderFailure('invalid-llm-response');
  let payload: unknown;
  try { payload = JSON.parse(outputText) as unknown; }
  catch { throw new ProposalProviderFailure('invalid-llm-response'); }
  if (!isRecord(payload) || typeof payload.unavailableReason === 'string') throw new ProposalProviderFailure('invalid-llm-response');
  const affectedProjectFiles = Array.isArray(payload.affectedProjectFiles) && payload.affectedProjectFiles.every(isNonEmptyString)
    ? payload.affectedProjectFiles.map((value) => value.trim()) : [];
  const changeSummary = readString(payload.changeSummary);
  const rationale = readString(payload.rationale);
  const expectedEvalImpact = readString(payload.expectedEvalImpact);
  const proposedChange = readProposedChange(payload.proposedChange);
  if (affectedProjectFiles.length !== 1 || !changeSummary || !rationale || !expectedEvalImpact || !proposedChange || proposedChange.kind === 'instructions') throw new ProposalProviderFailure('invalid-llm-response');
  if (validateProjectFileTargets('/project', affectedProjectFiles).status === 'blocked') throw new UnsafeRepairProposalTargetError();
  return { affectedProjectFiles, changeSummary, rationale, expectedEvalImpact, proposedChange };
}

function readProposedChange(value: unknown): RepairProposalDraft['proposedChange'] | null {
  if (!isRecord(value)) return null;
  const kind = value.kind === 'unified-diff' || value.kind === 'replacement' || value.kind === 'instructions' ? value.kind : null;
  const representation = readString(value.representation);
  return kind && representation ? { kind, representation } : null;
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) throw new ProposalProviderFailure('invalid-llm-response');
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (Array.isArray(payload.output)) {
    const text = payload.output.flatMap((item) => isRecord(item) && Array.isArray(item.content) ? item.content : []).find((content) => isRecord(content) && typeof content.text === 'string');
    if (isRecord(text) && typeof text.text === 'string') return text.text;
  }
  throw new ProposalProviderFailure('invalid-llm-response');
}
function classifyStatus(status: number): 'provider-authorization' | 'provider-rate-limit' | 'provider-timeout' | 'provider-unavailable' {
  if (status === 401 || status === 403) return 'provider-authorization';
  if (status === 429) return 'provider-rate-limit';
  if (status === 408 || status === 504) return 'provider-timeout';
  if (status >= 500 && status <= 599) return 'provider-unavailable';
  throw new Error('OpenAI repair proposal request failed.');
}
async function readBoundedResponse(response: Response): Promise<string> {
  if (!response.body) throw new ProposalProviderFailure('invalid-llm-response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_PROVIDER_RESPONSE_BYTES) throw new ProposalProviderFailure('invalid-llm-response');
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
function readString(value: unknown): string | null { return isNonEmptyString(value) ? value.trim() : null; }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
