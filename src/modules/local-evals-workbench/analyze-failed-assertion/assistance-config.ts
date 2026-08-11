import type { AssistanceConfig, AssistanceConfigPort } from './ports.js';

export const DEFAULT_FAILURE_ANALYSIS_MODEL = 'gpt-5-mini';

export type AssistanceEnvironment = {
  readonly OPENAI_API_KEY?: string;
  readonly SIBU_EVALS_MODEL?: string;
};

export class EnvironmentAssistanceConfig implements AssistanceConfigPort {
  constructor(private readonly environment: AssistanceEnvironment = process.env) {}

  getConfig(): AssistanceConfig {
    const selectedModel = this.environment.SIBU_EVALS_MODEL?.trim() || DEFAULT_FAILURE_ANALYSIS_MODEL;
    const apiKey = this.environment.OPENAI_API_KEY?.trim();
    return {
      hasOpenAiApiKey: Boolean(apiKey),
      assistanceModelLabel: selectedModel,
      apiKey: apiKey || undefined,
    };
  }
}
