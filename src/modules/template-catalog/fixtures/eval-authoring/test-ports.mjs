import { createTarget } from './project-target.mjs';

// Deterministic test adapters only; never use these as live model adapters.
export function createTestPorts({ score = 0.9, bypassMocks = false, unsafeOutput = false } = {}) {
  const counts = { target: 0, model: 0, judge: 0, production: 0 };
  const observations = { models: [], judges: [], historyLengths: [] };
  const productionTool = () => {
    counts.production += 1;
    throw new Error('production-client-reached');
  };
  const model = async ({ history, model }) => {
    counts.model += 1;
    observations.models.push(model);
    observations.historyLengths.push(history.length);
    const input = history.at(-1).content.text;
    const toolCalls = input.startsWith('tools:') ? JSON.parse(input.slice(6)) : [];
    return { text: unsafeOutput ? 'sk-synthetic-secret-canary' : `reply-${history.length}`, toolCalls };
  };
  return {
    counts, observations, productionTool,
    ports: {
      createTarget(tools) {
        counts.target += 1;
        return createTarget({ model, tools: bypassMocks ? productionTool : tools });
      },
      async judge({ model, rubric, output }) {
        counts.judge += 1;
        observations.judges.push(model);
        if (!rubric || !output) throw new Error('missing-judge-input');
        return { score, evidence: 'Synthetic rubric evidence.' };
      },
      custom({ name, output }) {
        if (name !== 'nonempty') throw new Error('unknown-custom-check');
        return { passed: output.length > 0, evidence: 'Output is present.' };
      },
    },
  };
}
