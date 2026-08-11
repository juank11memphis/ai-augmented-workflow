import { buildFailedAssertionAnalysisPrompt } from './prompt-builder.js';
import type { FailureAnalysisLlmPort } from './ports.js';
import type { FailureAnalysis, FailureLikelyCause } from './result.js';

export type OpenAiFailureAnalysisClient = {
  createResponse(request: { readonly model: string; readonly input: string; readonly apiKey: string }): Promise<{ readonly outputText: string }>;
};

export class FetchOpenAiFailureAnalysisClient implements OpenAiFailureAnalysisClient {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async createResponse(request: { readonly model: string; readonly input: string }): Promise<{ readonly outputText: string }> {
    const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: request.model, input: request.input }),
    });
    if (!response.ok) throw new Error('OpenAI failure analysis request failed.');
    const payload = await response.json() as unknown;
    return { outputText: extractOutputText(payload) };
  }
}

export class OpenAiFailureAnalysisAdapter implements FailureAnalysisLlmPort {
  constructor(private readonly apiKey: string, private readonly client: OpenAiFailureAnalysisClient = new FetchOpenAiFailureAnalysisClient(apiKey)) {}

  async analyzeFailure(request: Parameters<FailureAnalysisLlmPort['analyzeFailure']>[0]): Promise<FailureAnalysis> {
    const prompt = buildFailedAssertionAnalysisPrompt(request.evidence);
    const response = await this.client.createResponse({ model: request.model, input: prompt, apiKey: this.apiKey });
    return parseFailureAnalysis(response.outputText);
  }
}

export function parseFailureAnalysis(outputText: string): FailureAnalysis {
  const payload = JSON.parse(outputText) as unknown;
  if (!isRecord(payload)) throw new Error('Failure analysis response must be an object.');
  const exactFailureExplanation = readString(payload.exactFailureExplanation);
  const likelyCause = readLikelyCause(payload.likelyCause);
  const evidenceSummary = readString(payload.evidenceSummary);
  const uncertainty = readString(payload.uncertainty);
  if (!exactFailureExplanation || !likelyCause || !evidenceSummary || !uncertainty) throw new Error('Failure analysis response is missing required fields.');
  return { exactFailureExplanation, likelyCause, evidenceSummary, uncertainty };
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

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readLikelyCause(value: unknown): FailureLikelyCause | null {
  return value === 'prompt_issue' || value === 'eval_assertion_issue' || value === 'fixture_input_issue' || value === 'model_nondeterminism' || value === 'unclear_needs_human_judgment' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
