import { validateProjectFileTargets } from './project-file-safety.js';
import { buildRepairProposalPrompt } from './prompt-builder.js';
import type { RepairProposalDraft, RepairProposalLlmPort } from './ports.js';

export type OpenAiRepairProposalClient = {
  createResponse(request: { readonly model: string; readonly input: string; readonly apiKey: string }): Promise<{ readonly outputText: string }>;
};

export class FetchOpenAiRepairProposalClient implements OpenAiRepairProposalClient {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async createResponse(request: { readonly model: string; readonly input: string }): Promise<{ readonly outputText: string }> {
    const response = await this.fetchImpl('https://api.openai.com/v1/responses', { method: 'POST', headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: request.model, input: request.input }) });
    if (!response.ok) throw new Error('OpenAI repair proposal request failed.');
    return { outputText: extractOutputText(await response.json() as unknown) };
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
  const payload = JSON.parse(outputText) as unknown;
  if (!isRecord(payload) || typeof payload.unavailableReason === 'string') throw new Error('Repair proposal unavailable or unreadable.');
  const affectedProjectFiles = Array.isArray(payload.affectedProjectFiles) ? payload.affectedProjectFiles.filter(isNonEmptyString).map((value) => value.trim()) : [];
  const changeSummary = readString(payload.changeSummary);
  const rationale = readString(payload.rationale);
  const expectedEvalImpact = readString(payload.expectedEvalImpact);
  const proposedChange = readProposedChange(payload.proposedChange);
  if (affectedProjectFiles.length === 0 || !changeSummary || !rationale || !expectedEvalImpact || !proposedChange) throw new Error('Repair proposal response is missing required fields.');
  if (validateProjectFileTargets('/project', affectedProjectFiles).status === 'blocked') throw new Error('Repair proposal response includes unsafe target files.');
  return { affectedProjectFiles, changeSummary, rationale, expectedEvalImpact, proposedChange };
}

function readProposedChange(value: unknown): RepairProposalDraft['proposedChange'] | null {
  if (!isRecord(value)) return null;
  const kind = value.kind === 'unified-diff' || value.kind === 'replacement' || value.kind === 'instructions' ? value.kind : null;
  const representation = readString(value.representation);
  return kind && representation ? { kind, representation } : null;
}

function extractOutputText(payload: unknown): string {
  if (!isRecord(payload)) throw new Error('OpenAI response was unreadable.');
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (Array.isArray(payload.output)) {
    const text = payload.output.flatMap((item) => isRecord(item) && Array.isArray(item.content) ? item.content : []).find((content) => isRecord(content) && typeof content.text === 'string');
    if (isRecord(text) && typeof text.text === 'string') return text.text;
  }
  throw new Error('OpenAI response did not include output text.');
}
function readString(value: unknown): string | null { return isNonEmptyString(value) ? value.trim() : null; }
function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
