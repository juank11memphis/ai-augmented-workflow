import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { discoverConventionalEvalSuites } from './handler.js';
import type { EvalSuiteDiscoveryLogEvent, EvalSuiteDiscoveryLoggerPort, EvalSuiteDiscoveryReaderPort, RawEvalSuiteDefinition } from './ports.js';

const projectRoot = '/repo/root';

describe('discoverConventionalEvalSuites', () => {
  it('summarizes valid suite definitions from unknown payloads', async () => {
    const logger = new CapturingDiscoveryLogger();
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals/skill-authoring.json', payload: validSuite(), diagnostics: [] }]),
      logger,
      clock: sequenceClock(100, 108),
    });

    assert.equal(result.status, 'ready');
    assert.deepEqual(result.suites, [{
      id: 'skill-authoring',
      name: 'Skill authoring checks',
      description: 'Checks generated skills.',
      readyTestCaseCount: 1,
      modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    }]);
    assert.deepEqual(logger.events.at(-1), {
      event: 'eval_suite_discovery_completed',
      outcome: 'ready',
      suiteCount: 1,
      diagnosticCount: 0,
      unsupportedCount: 0,
      durationMs: 8,
    });
  });

  it('returns blocked setup guidance when evals are missing', async () => {
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals', payload: undefined, diagnostics: [{ code: 'evals-folder-missing', severity: 'info', location: 'evals', message: 'Missing evals folder.' }] }]),
      logger: new CapturingDiscoveryLogger(),
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'missing-evals-folder');
    assert.match(result.guidance.join('\n'), /evals\//);
  });

  it('preserves valid suites while reporting malformed and unsupported diagnostics', async () => {
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([
        { source: 'evals/valid.json', payload: validSuite(), diagnostics: [] },
        { source: 'evals/malformed.json', payload: { version: 1, kind: 'sibu-eval-suite', id: 7 }, diagnostics: [] },
        { source: 'evals/future.json', payload: { ...validSuite(), version: 99 }, diagnostics: [] },
      ]),
      logger: new CapturingDiscoveryLogger(),
    });

    assert.equal(result.status, 'ready');
    assert.equal(result.suites.length, 1);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'suite-definition-malformed'));
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'suite-definition-unsupported'));
  });

  it('narrows unknown boundary data before use and blocks malformed primitive and array shapes', async () => {
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([
        { source: 'evals/string.json', payload: 'not an object', diagnostics: [] },
        { source: 'evals/array.json', payload: [], diagnostics: [] },
        { source: 'evals/wrong-nested.json', payload: { ...validSuite(), modelOptions: [{ id: 10 }], testCases: [{ id: 'x', input: 'bad' }] }, diagnostics: [] },
      ]),
      logger: new CapturingDiscoveryLogger(),
    });

    assert.equal(result.status, 'blocked');
    assert.equal(result.suites.length, 0);
    assert.ok(result.diagnostics.length >= 3);
  });

  it('logs only safe discovery metadata', async () => {
    const logger = new CapturingDiscoveryLogger();
    await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals/secret.json', payload: { prompt: 'OPENAI_API_KEY=secret raw prompt', projectRoot }, diagnostics: [] }]),
      logger,
    });

    const logs = JSON.stringify(logger.events);
    assert.doesNotMatch(logs, /secret|OPENAI_API_KEY|raw prompt|\/repo\/root/);
    assert.match(logs, /diagnosticCount/);
  });
});

function command() {
  return { type: 'discover-conventional-eval-suites' as const, projectRoot };
}

function validSuite(): Record<string, unknown> {
  return {
    version: 1,
    kind: 'sibu-eval-suite',
    id: 'skill-authoring',
    name: 'Skill authoring checks',
    description: 'Checks generated skills.',
    modelOptions: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }],
    testCases: [{ id: 'missing-boundary', input: { prompt: 'short prompt' }, assertions: [{ type: 'contains', value: 'hard stop' }] }],
  };
}

function reader(definitions: readonly RawEvalSuiteDefinition[]): EvalSuiteDiscoveryReaderPort {
  return { readConventionalEvalSuites: async () => definitions };
}

function sequenceClock(...values: readonly number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

class CapturingDiscoveryLogger implements EvalSuiteDiscoveryLoggerPort {
  readonly events: EvalSuiteDiscoveryLogEvent[] = [];

  info(event: EvalSuiteDiscoveryLogEvent): void {
    this.events.push(event);
  }

  warn(event: EvalSuiteDiscoveryLogEvent): void {
    this.events.push(event);
  }
}
