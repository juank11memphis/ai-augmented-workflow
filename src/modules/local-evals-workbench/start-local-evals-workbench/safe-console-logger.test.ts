import assert from 'node:assert/strict';
import { it } from 'node:test';

import { SafeConsoleLocalEvalsLogger } from './safe-console-logger.js';

it('allowlists structured discovery fields and drops unexpected sensitive payloads', () => {
  const messages: string[] = [];
  const original = console.error;
  console.error = (message?: unknown) => messages.push(String(message));
  try {
    const logger = new SafeConsoleLocalEvalsLogger();
    const event = Object.assign({
      event: 'eval_suite_discovery_completed' as const,
      outcome: 'blocked' as const,
      suiteCount: 0,
      diagnosticCount: 1,
      unsupportedCount: 0,
      reasonCodes: ['sensitive-content-detected', 'OPENAI_API_KEY=sk-log-secret'],
      durationMs: -10,
    }, {
      prompt: 'private prompt',
      modelOutput: 'private model output',
      unsafePath: '/private/project/evals/secret.json',
      environmentValue: 'sk-log-secret',
    });
    logger.warn(event);
  } finally {
    console.error = original;
  }

  assert.match(messages[0] ?? '', /eval_suite_discovery_completed/);
  assert.match(messages[0] ?? '', /sensitive-content-detected/);
  assert.match(messages[0] ?? '', /"durationMs":0/);
  assert.doesNotMatch(messages[0] ?? '', /OPENAI_API_KEY|private prompt|model output|private\/project|sk-log-secret/);
});
