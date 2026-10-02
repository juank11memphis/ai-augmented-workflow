import { buildFailedAssertionAnalysisPrompt } from './prompt-builder.js';
import { FailureAnalysisProviderError } from './ports.js';
import type { FailureAnalysisLlmPort, FailureAnalysisProviderCategory } from './ports.js';
import type { FailureAnalysis, FailureLikelyCause } from './result.js';

export type OpenAiFailureAnalysisClient = {
  createResponse(request: { readonly model: string; readonly input: string; readonly apiKey: string }): Promise<{ readonly outputText: string }>;
};

export class FetchOpenAiFailureAnalysisClient implements OpenAiFailureAnalysisClient {
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async createResponse(request: { readonly model: string; readonly input: string }): Promise<{ readonly outputText: string }> {
    let response: Response;
    try {
      response = await this.fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: request.model, input: request.input }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      throw new FailureAnalysisProviderError(fetchFailureCategory(error));
    }
    if (!response.ok) throw new FailureAnalysisProviderError(httpFailureCategory(response.status));
    let body: string;
    try {
      body = await readBoundedResponse(response);
    } catch (error) {
      if (error instanceof FailureAnalysisProviderError) throw error;
      throw new FailureAnalysisProviderError('unknown');
    }
    try {
      const payload = JSON.parse(body) as unknown;
      return { outputText: extractOutputText(payload) };
    } catch {
      throw new FailureAnalysisProviderError('invalid-response');
    }
  }
}

function httpFailureCategory(status: number): FailureAnalysisProviderCategory {
  if (status === 401 || status === 403) return 'authorization';
  if (status === 429) return 'rate-limit';
  if (status >= 500 && status <= 599) return 'unavailable';
  return 'unknown';
}

function fetchFailureCategory(error: unknown): FailureAnalysisProviderCategory {
  if (error instanceof DOMException && error.name === 'TimeoutError') return 'timeout';
  if (error instanceof TypeError) return 'unavailable';
  return 'unknown';
}

async function readBoundedResponse(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  while (true) {
    const next = await reader.read();
    if (next.done) return body + decoder.decode();
    bytes += next.value.byteLength;
    if (bytes > 16_000) {
      try { await reader.cancel(); } catch { /* The observed size limit remains the failure cause. */ }
      throw new FailureAnalysisProviderError('invalid-response');
    }
    body += decoder.decode(next.value, { stream: true });
  }
}

export class OpenAiFailureAnalysisAdapter implements FailureAnalysisLlmPort {
  constructor(private readonly apiKey: string, private readonly client: OpenAiFailureAnalysisClient = new FetchOpenAiFailureAnalysisClient(apiKey),
    private readonly timeoutMs = 20_000) {}

  async analyzeFailure(request: Parameters<FailureAnalysisLlmPort['analyzeFailure']>[0]): Promise<FailureAnalysis> {
    const prompt = buildFailedAssertionAnalysisPrompt(request.evidence);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new FailureAnalysisProviderError('timeout')), this.timeoutMs);
    });
    let response: Awaited<ReturnType<OpenAiFailureAnalysisClient['createResponse']>>;
    try {
      response = await Promise.race([this.client.createResponse({ model: request.model, input: prompt, apiKey: this.apiKey }), timedOut]);
    } catch (error) {
      if (error instanceof FailureAnalysisProviderError) throw error;
      throw new FailureAnalysisProviderError('unknown');
    } finally {
      clearTimeout(timeout);
    }
    return parseFailureAnalysis(response.outputText);
  }
}

export function parseFailureAnalysis(outputText: string): FailureAnalysis {
  if (outputText.length > 8_000) throw new FailureAnalysisProviderError('invalid-response');
  let payload: unknown;
  try {
    payload = JSON.parse(outputText) as unknown;
  } catch {
    throw new FailureAnalysisProviderError('invalid-response');
  }
  if (!isRecord(payload)) throw new FailureAnalysisProviderError('invalid-response');
  const exactFailureExplanation = readString(payload.exactFailureExplanation);
  const likelyCause = readLikelyCause(payload.likelyCause);
  const evidenceSummary = readString(payload.evidenceSummary);
  const uncertainty = readString(payload.uncertainty);
  if (!exactFailureExplanation || !likelyCause || !evidenceSummary || !uncertainty) throw new FailureAnalysisProviderError('invalid-response');
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
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 1_200 ? value.trim() : null;
}

function readLikelyCause(value: unknown): FailureLikelyCause | null {
  return value === 'prompt_issue' || value === 'eval_assertion_issue' || value === 'fixture_input_issue' || value === 'model_nondeterminism' || value === 'unclear_needs_human_judgment' ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
