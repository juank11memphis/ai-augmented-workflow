import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { discoverConventionalEvalSuites } from './handler.js';
import type { EvalSuiteDiscoveryLogEvent, EvalSuiteDiscoveryLoggerPort, EvalSuiteDiscoveryReaderPort, RawEvalSuiteDefinition } from './ports.js';
import type { EvalSuiteDiscoveryDiagnostic } from './result.js';

const projectRoot = '/repo/root';

describe('discoverConventionalEvalSuites', () => {
  it('returns normalized provider-independent version-2 suite data', async () => {
    const logger = new CapturingDiscoveryLogger();
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals/suite.json', payload: validSuite(), diagnostics: [] }]),
      logger,
      clock: sequenceClock(100, 108),
    });

    assert.equal(result.status, 'ready');
    assert.equal(result.definitions[0]?.version, 2);
    assert.deepEqual(result.suites[0]?.modelOptions, []);
    assert.deepEqual(result.suites[0]?.testCases, [{ id: 'case', name: 'Case' }]);
    assert.deepEqual(logger.events.at(-1), {
      event: 'eval_suite_discovery_completed', outcome: 'ready', suiteCount: 1,
      diagnosticCount: 0, unsupportedCount: 0, reasonCodes: [], durationMs: 8,
    });
  });

  it('preserves valid suites while blocking malformed, unsafe, and unsupported definitions', async () => {
    const unsafe = diagnostic('sensitive-content-detected', 'sensitive-file-content');
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([
        { source: 'evals/valid.json', payload: validSuite(), diagnostics: [] },
        { source: 'evals/malformed.json', payload: { version: 2, kind: 'sibu-eval-suite' }, diagnostics: [] },
        { source: 'evals/legacy.json', payload: { version: 1, input: 'legacy prompt', expected: 'static output' }, diagnostics: [] },
        { source: 'evals/unsafe.json', payload: validSuite({ id: 'unsafe' }), diagnostics: [] },
      ], new Map([['unsafe', [unsafe]]])),
      logger: new CapturingDiscoveryLogger(),
    });

    assert.equal(result.status, 'ready');
    assert.deepEqual(result.suites.map((suite) => suite.id), ['suite']);
    assert.ok(result.diagnostics.some((item) => item.code === 'suite-definition-malformed'));
    assert.ok(result.diagnostics.some((item) => item.code === 'suite-definition-unsupported'));
    assert.ok(result.diagnostics.some((item) => item.code === 'sensitive-content-detected'));
    assert.doesNotMatch(JSON.stringify(result), /legacy prompt|static output/);
  });

  it('excludes every colliding suite ID rather than selecting by reader order', async () => {
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([
        { source: 'evals/a.json', payload: validSuite({ id: 'collision', name: 'First' }), diagnostics: [] },
        { source: 'evals/b.json', payload: validSuite({ id: 'safe', name: 'Safe' }), diagnostics: [] },
        { source: 'evals/c.json', payload: validSuite({ id: 'collision', name: 'Second' }), diagnostics: [] },
      ]),
      logger: new CapturingDiscoveryLogger(),
    });

    assert.equal(result.status, 'ready');
    assert.deepEqual(result.suites.map((suite) => suite.id), ['safe']);
    assert.equal(result.diagnostics.filter((item) => item.code === 'suite-id-duplicate').length, 1);
  });

  it('returns safe blocked setup guidance for missing folders and unsupported-only projects', async () => {
    const missing = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals', payload: undefined, diagnostics: [{ code: 'evals-folder-missing', reason: 'evals-folder-missing', severity: 'info', location: 'evals', message: 'Missing evals folder.' }] }]),
      logger: new CapturingDiscoveryLogger(),
    });
    assert.equal(missing.status, 'blocked');
    assert.equal(missing.reason, 'missing-evals-folder');

    const unsupported = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals/future.json', payload: { ...validSuite(), version: 99 }, diagnostics: [] }]),
      logger: new CapturingDiscoveryLogger(),
    });
    assert.equal(unsupported.status, 'blocked');
    assert.equal(unsupported.reason, 'unreadable-eval-suites');
    assert.match(unsupported.guidance.join(' '), /version 2/i);
    assert.equal(unsupported.suites.length, 0);
  });

  it('distinguishes empty suites, unreadable definitions, and an unknown reader failure', async () => {
    const emptyLogger = new CapturingDiscoveryLogger();
    const empty = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals', payload: undefined, diagnostics: [{ code: 'suite-definition-malformed', reason: 'no-suite-definitions', severity: 'warning', location: 'evals', message: 'No JSON definitions.' }] }]),
      logger: emptyLogger,
    });
    if (empty.status !== 'blocked') assert.fail('Expected empty discovery to be blocked');
    assert.equal(empty.reason, 'no-eval-suites');
    assert.match(empty.message, /No eval suites/);
    assert.equal(emptyLogger.events.at(-1)?.event, 'eval_suite_discovery_completed');

    const unreadableLogger = new CapturingDiscoveryLogger();
    const unreadable = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals/bad.json', payload: undefined, diagnostics: [{ code: 'suite-file-read-failed', reason: 'sk-synthetic-secret-marker', severity: 'error', location: 'evals/bad.json', message: 'Cannot read suite.' }] }]),
      logger: unreadableLogger,
    });
    if (unreadable.status !== 'blocked') assert.fail('Expected unreadable discovery to be blocked');
    assert.equal(unreadable.reason, 'unreadable-eval-suites');
    assert.doesNotMatch(unreadable.message, /No eval suites/);
    assert.deepEqual((unreadableLogger.events.at(-1) as Extract<EvalSuiteDiscoveryLogEvent, { event: 'eval_suite_discovery_completed' }>).reasonCodes, ['suite-file-read-failed']);
    assert.doesNotMatch(JSON.stringify(unreadableLogger.events), /sk-synthetic-secret-marker|bad\.json/);

    const failedLogger = new CapturingDiscoveryLogger();
    const failed = await discoverConventionalEvalSuites(command(), {
      discoveryReader: { ...reader([]), readConventionalEvalSuites: async () => { throw new Error('sk-synthetic-secret-marker'); } },
      logger: failedLogger,
    });
    if (failed.status !== 'blocked') assert.fail('Expected failed discovery to be blocked');
    assert.equal(failed.reason, 'discovery-failed');
    assert.match(failed.message, /underlying cause is unknown/);
    assert.doesNotMatch(JSON.stringify({ result: failed, events: failedLogger.events }), /sk-synthetic-secret-marker/);
  });

  it('keeps the discovery outcome when the logging sink fails', async () => {
    const result = await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: 'evals/suite.json', payload: validSuite(), diagnostics: [] }]),
      logger: { info: () => { throw new Error('sink unavailable'); }, warn: () => { throw new Error('sink unavailable'); } },
    });
    assert.equal(result.status, 'ready');
  });

  it('logs stable event names and safe counts, duration, outcomes, and reason codes only', async () => {
    const logger = new CapturingDiscoveryLogger();
    const unsafePayload = {
      ...validSuite(), id: 'unsafe',
      testCases: [{ id: 'case', turns: [{ role: 'user', content: 'OPENAI_API_KEY=sk-log-sensitive-value' }], assertions: [{ id: 'a', type: 'output-contains', expected: 'private model output' }] }],
    };
    await discoverConventionalEvalSuites(command(), {
      discoveryReader: reader([{ source: '/unsafe/absolute/path.json', payload: unsafePayload, diagnostics: [] }]),
      logger,
      clock: sequenceClock(12, 10),
    });

    assert.deepEqual(logger.events.map((event) => event.event), ['eval_suite_discovery_started', 'eval_suite_discovery_completed']);
    const serialized = JSON.stringify(logger.events);
    assert.match(serialized, /sensitive-inline-content|sensitive-content-detected/);
    assert.match(serialized, /"durationMs":0/);
    assert.doesNotMatch(serialized, /sk-log-sensitive-value|private model output|unsafe\/absolute|OPENAI_API_KEY/);
  });
});

function command() { return { type: 'discover-conventional-eval-suites' as const, projectRoot }; }

function validSuite(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Safe description.',
    target: { id: 'target', kind: 'agent', path: 'src/target.ts' },
    coverage: { categories: [{ id: 'happy', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] },
    testCases: [{ id: 'case', name: 'Case', turns: [{ role: 'user', content: 'Safe input.' }], assertions: [{ id: 'output', type: 'output-contains', expected: 'safe' }], graders: [] }],
    ...overrides,
  };
}

function reader(definitions: readonly RawEvalSuiteDefinition[], inspected = new Map<string, readonly EvalSuiteDiscoveryDiagnostic[]>()): EvalSuiteDiscoveryReaderPort {
  return {
    readConventionalEvalSuites: async () => definitions,
    inspectDeclaredInputs: async (_root, _source, suite) => {
      const diagnostics = inspected.get(suite.id) ?? [];
      return diagnostics.length > 0 ? { status: 'blocked', diagnostics } : { status: 'safe' };
    },
  };
}

function diagnostic(code: EvalSuiteDiscoveryDiagnostic['code'], reason: string): EvalSuiteDiscoveryDiagnostic {
  return { code, reason, severity: 'error', location: 'fixture', message: 'Unsafe declared input.' };
}

function sequenceClock(...values: readonly number[]): () => number {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

class CapturingDiscoveryLogger implements EvalSuiteDiscoveryLoggerPort {
  readonly events: EvalSuiteDiscoveryLogEvent[] = [];
  info(event: EvalSuiteDiscoveryLogEvent): void { this.events.push(event); }
  warn(event: EvalSuiteDiscoveryLogEvent): void { this.events.push(event); }
}
