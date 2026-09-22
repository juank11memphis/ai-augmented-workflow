import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateEvalSuiteContract } from './suite-contract.js';

describe('version-2 eval suite contract', () => {
  it('normalizes every supported assertion, grader, content, turn, and mock shape', () => {
    const result = validateEvalSuiteContract(fullSuite(), 'evals/full.json');
    assert.equal(result.status, 'valid');
    if (result.status !== 'valid') return;

    assert.equal(result.suite.version, 2);
    assert.deepEqual(result.suite.testCases[0]?.assertions.map((assertion) => assertion.type), [
      'output-equals', 'output-contains', 'json-schema', 'tool-called', 'tool-not-called',
      'tool-arguments-equal', 'tool-arguments-schema', 'tool-call-sequence', 'turn-count', 'turn-output',
    ]);
    assert.deepEqual(result.suite.testCases.flatMap((testCase) => testCase.graders.map((grader) => grader.type)), ['custom', 'rubric']);
    assert.deepEqual(result.suite.testCases.flatMap((testCase) => testCase.toolMocks.map((mock) => mock.outcome.type)), ['result', 'error', 'unexpected-response']);
    assert.deepEqual(result.suite.testCases.map((testCase) => testCase.turns.length), [1, 2]);
    assert.deepEqual(result.suite.runner.requiredEnvironment, ['OPENAI_API_KEY']);
  });

  it('accepts all target kinds and coverage statuses with required reasons', () => {
    for (const kind of ['agent', 'integration', 'prompt', 'workflow']) {
      const result = validateEvalSuiteContract(validSuite({ target: { id: 'target', kind, path: 'src/target.ts' } }));
      assert.equal(result.status, 'valid', `target kind ${kind}`);
    }
    for (const status of ['covered', 'partly-covered', 'not-applicable', 'known-gap']) {
      const category = status === 'covered' ? { id: 'category', status } : { id: 'category', status, reason: 'Explicit reason.' };
      const result = validateEvalSuiteContract(validSuite({ coverage: { categories: [category], gaps: [] } }));
      assert.equal(result.status, 'valid', `coverage status ${status}`);
    }
  });

  it('rejects version 1 and unknown versions through only the unsupported-version branch', () => {
    for (const payload of [legacyVersionOne(), { ...legacyVersionOne(), version: 3 }, { ...legacyVersionOne(), version: '2' }]) {
      const result = validateEvalSuiteContract(payload, 'evals/unsupported.json');
      assert.equal(result.status, 'invalid');
      if (result.status !== 'invalid') continue;
      assert.equal(result.diagnostics.length, 1);
      assert.equal(result.diagnostics[0]?.reason, 'unsupported-suite-version');
      assert.match(result.diagnostics[0]?.guidance?.join(' ') ?? '', /version 2/i);
      assert.doesNotMatch(JSON.stringify(result), /legacy prompt|static output/);
    }
  });

  it('rejects malformed command arrays, shell tokens, environment values, and duplicate names', () => {
    const cases = [
      { command: [], requiredEnvironment: [] },
      { command: 'node evals/runner.mjs', requiredEnvironment: [] },
      { command: ['node', 'evals/runner.mjs', '&&', 'curl'], requiredEnvironment: [] },
      { command: ['node', 'evals/runner.mjs;curl'], requiredEnvironment: [] },
      { command: ['node', 'evals/runner.mjs'], requiredEnvironment: ['OPENAI_API_KEY=secret-value'] },
      { command: ['node', 'evals/runner.mjs'], requiredEnvironment: ['OPENAI_API_KEY', 'OPENAI_API_KEY'] },
    ];
    for (const runner of cases) assert.equal(validateEvalSuiteContract(validSuite({ runner })).status, 'invalid');
  });

  it('rejects shell launchers and interpreter command-string evaluation without blocking direct runtimes', () => {
    const unsafeCommands = [
      ['sh', '-c', 'node evals/runner.mjs'],
      ['/bin/bash', '-c', 'node evals/runner.mjs'],
      ['pwsh', '-Command', 'node evals/runner.mjs'],
      ['node', '--eval', 'import("./evals/runner.mjs")'],
      ['python3', '-c', 'exec(open("evals/runner.py").read())'],
    ];
    for (const command of unsafeCommands) {
      const result = validateEvalSuiteContract(validSuite({ runner: { command, requiredEnvironment: [] } }));
      assert.equal(result.status, 'invalid', command.join(' '));
      if (result.status === 'invalid') assert.ok(result.diagnostics.some((item) => item.reason === 'runner-command-evaluation'));
    }

    assert.equal(validateEvalSuiteContract(validSuite({ runner: { command: ['node', 'runner.mjs'], requiredEnvironment: [] } })).status, 'valid');
    assert.equal(validateEvalSuiteContract(validSuite({ runner: { command: ['python3', 'evals/runner.py'], requiredEnvironment: [] } })).status, 'valid');
  });

  it('rejects undeclared top-level, legacy, misspelled, and nested fields', () => {
    const payloads = [
      { ...validSuite(), input: { prompt: 'legacy' } },
      { ...validSuite(), modelOptions: [] },
      { ...validSuite(), output: 'static' },
      validSuite({ runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironmnt: [] } }),
      validSuite({ testCases: [validCase({ turns: [{ role: 'user', content: { type: 'inline', text: 'Safe.', extra: true } }] })] }),
      validSuite({ testCases: [validCase({ assertions: [{ id: 'output', type: 'output-contains', expected: 'safe', unexpected: true }] })] }),
    ];
    for (const payload of payloads) {
      const result = validateEvalSuiteContract(payload);
      assert.equal(result.status, 'invalid');
      if (result.status === 'invalid') assert.ok(result.diagnostics.some((item) => item.reason === 'field-undeclared'));
    }
  });

  it('fails closed on excessive structure depth and complexity without throwing', () => {
    let deepValue: unknown = 'leaf';
    for (let index = 0; index < 70; index += 1) deepValue = { child: deepValue };
    const deep = validateEvalSuiteContract(validSuite({ testCases: [validCase({ fixture: { type: 'inline', value: deepValue } })] }));
    assert.equal(deep.status, 'invalid');
    if (deep.status === 'invalid') assert.equal(deep.diagnostics[0]?.reason, 'suite-structure-too-deep');

    const complexValue = Array.from({ length: 10_001 }, () => ({}));
    const complex = validateEvalSuiteContract(validSuite({ testCases: [validCase({ fixture: { type: 'inline', value: complexValue } })] }));
    assert.equal(complex.status, 'invalid');
    if (complex.status === 'invalid') assert.equal(complex.diagnostics[0]?.reason, 'suite-structure-too-complex');
  });

  it('preserves safe arbitrary JSON and rejects prototype-sensitive property names', () => {
    const safe = validateEvalSuiteContract(validSuite({
      testCases: [validCase({ fixture: { type: 'inline', value: { nested: { count: 2 }, items: [true, null, 'safe'] } } })],
    }));
    assert.equal(safe.status, 'valid');
    if (safe.status === 'valid') {
      assert.deepEqual(safe.suite.testCases[0]?.fixture, { type: 'inline', value: { nested: { count: 2 }, items: [true, null, 'safe'] } });
    }

    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const value = JSON.parse(`{"safe":true,"${key}":{"polluted":true}}`) as unknown;
      const result = validateEvalSuiteContract(validSuite({ testCases: [validCase({ fixture: { type: 'inline', value } })] }));

      assert.equal(result.status, 'invalid', key);
      if (result.status === 'invalid') assert.ok(result.diagnostics.some((diagnostic) => diagnostic.reason === 'json-property-name-unsafe'));
      assert.equal(({} as { polluted?: boolean }).polluted, undefined);
    }

    const inheritedPrototype = Object.create({ polluted: true }) as Record<string, unknown>;
    inheritedPrototype.safe = true;
    const inherited = validateEvalSuiteContract(validSuite({ testCases: [validCase({ fixture: { type: 'inline', value: inheritedPrototype } })] }));
    assert.equal(inherited.status, 'invalid');
    if (inherited.status === 'invalid') assert.ok(inherited.diagnostics.some((diagnostic) => diagnostic.reason === 'json-object-prototype-unsafe'));
  });

  it('rejects absolute, traversal, null-byte, and malformed declared paths before filesystem access', () => {
    const invalidPaths = ['/tmp/target.ts', '../target.ts', 'src\0target.ts', 'C:\\target.ts', 'src//target.ts'];
    for (const targetPath of invalidPaths) {
      const result = validateEvalSuiteContract(validSuite({ target: { id: 'target', kind: 'agent', path: targetPath } }));
      assert.equal(result.status, 'invalid', targetPath);
      if (result.status === 'invalid') assert.ok(result.diagnostics.some((item) => item.code === 'declared-path-invalid' || item.code === 'declared-path-unsafe'));
    }
    for (const referencePath of ['/tmp/input.json', '../input.json', 'fixtures/../input.json', 'fixtures/\0input.json']) {
      const result = validateEvalSuiteContract(validSuite({ testCases: [validCase({ fixture: { type: 'file', path: referencePath } })] }));
      assert.equal(result.status, 'invalid', referencePath);
    }
  });

  it('rejects missing turns, missing checks, invalid roles, invalid thresholds, and wrong shapes', () => {
    const cases = [
      validSuite({ testCases: [validCase({ turns: [] })] }),
      validSuite({ testCases: [validCase({ assertions: [], graders: [] })] }),
      validSuite({ testCases: [validCase({ turns: [{ role: 'developer', content: 'hello' }] })] }),
      validSuite({ testCases: [validCase({ assertions: [], graders: [{ id: 'grade', type: 'rubric', rubric: 'Good.', threshold: 2 }] })] }),
      null,
      [],
      'suite',
      validSuite({ coverage: [] }),
    ];
    for (const payload of cases) assert.equal(validateEvalSuiteContract(payload).status, 'invalid');
  });

  it('rejects duplicate identifiers in every suite-local scope', () => {
    const duplicateCases = [
      validSuite({ coverage: { categories: [{ id: 'x', status: 'covered' }, { id: 'x', status: 'covered' }], gaps: [] } }),
      validSuite({ coverage: { categories: [{ id: 'x', status: 'covered' }], gaps: [{ id: 'g', reason: 'one' }, { id: 'g', reason: 'two' }] } }),
      validSuite({ testCases: [validCase(), validCase()] }),
      validSuite({ testCases: [validCase({ toolMocks: [resultMock('m'), resultMock('m')] })] }),
      validSuite({ testCases: [validCase({ assertions: [{ id: 'same', type: 'output-contains', expected: 'ok' }], graders: [{ id: 'same', type: 'custom', name: 'customCheck' }] })] }),
    ];
    for (const payload of duplicateCases) {
      const result = validateEvalSuiteContract(payload);
      assert.equal(result.status, 'invalid');
      if (result.status === 'invalid') assert.ok(result.diagnostics.some((diagnostic) => diagnostic.reason?.includes('duplicate')));
    }
  });

  it('fails closed on inline secrets and credential-bearing JSON without echoing values', () => {
    const secrets = [
      validSuite({ testCases: [validCase({ turns: [{ role: 'user', content: 'OPENAI_API_KEY=sk-sensitive-value' }] })] }),
      validSuite({ testCases: [validCase({ fixture: { type: 'inline', value: { password: 'correct-horse-battery-staple' } } })] }),
      validSuite({ testCases: [validCase({ fixture: { type: 'inline', value: { note: '-----BEGIN PRIVATE KEY-----' } } })] }),
      { ...validSuite(), apiKey: 'sk-top-level-sensitive-value' },
    ];
    for (const payload of secrets) {
      const result = validateEvalSuiteContract(payload);
      assert.equal(result.status, 'invalid');
      assert.match(JSON.stringify(result), /sensitive-content-detected/);
      assert.doesNotMatch(JSON.stringify(result), /sk-sensitive-value|correct-horse-battery-staple|BEGIN PRIVATE KEY/);
    }
  });
});

function validSuite(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2,
    kind: 'sibu-eval-suite',
    id: 'support-agent',
    name: 'Support agent',
    description: 'Checks support behavior.',
    target: { id: 'support-agent', kind: 'agent', path: 'src/support-agent.ts' },
    coverage: { categories: [{ id: 'happy-path', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runners/support-agent.mjs'], requiredEnvironment: [] },
    testCases: [validCase()],
    ...overrides,
  };
}

function validCase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'case-one',
    name: 'Case one',
    turns: [{ role: 'user', content: 'Help with my order.' }],
    toolMocks: [],
    assertions: [{ id: 'contains-help', type: 'output-contains', expected: 'help' }],
    graders: [],
    ...overrides,
  };
}

function fullSuite(): Record<string, unknown> {
  const assertions = [
    { id: 'a1', type: 'output-equals', expected: { type: 'file', path: 'references/output.txt' } },
    { id: 'a2', type: 'output-contains', expected: 'approved' },
    { id: 'a3', type: 'json-schema', schema: { type: 'object' } },
    { id: 'a4', type: 'tool-called', tool: 'lookup' },
    { id: 'a5', type: 'tool-not-called', tool: 'refund' },
    { id: 'a6', type: 'tool-arguments-equal', tool: 'lookup', expected: { id: 1 } },
    { id: 'a7', type: 'tool-arguments-schema', tool: 'lookup', schema: { type: 'object' } },
    { id: 'a8', type: 'tool-call-sequence', tools: ['lookup', 'refund'] },
    { id: 'a9', type: 'turn-count', expected: 2 },
    { id: 'a10', type: 'turn-output', turnIndex: 1, operator: 'contains', expected: 'verified' },
  ];
  return validSuite({
    coverage: {
      categories: [
        { id: 'happy', status: 'covered' },
        { id: 'edge', status: 'partly-covered', reason: 'Bounded edge coverage.' },
        { id: 'live', status: 'not-applicable', reason: 'No live tools.' },
        { id: 'latency', status: 'known-gap', reason: 'Local only.' },
      ],
      gaps: [{ id: 'outage', reason: 'No network.' }],
    },
    runner: { command: ['node', 'evals/runners/support-agent.mjs'], requiredEnvironment: ['OPENAI_API_KEY'] },
    testCases: [
      validCase({
        fixture: { type: 'inline', value: { order: 1 } },
        reference: { type: 'file', path: 'references/context.md' },
        toolMocks: [resultMock('m1'), { id: 'm2', tool: 'lookup', input: { id: 2 }, outcome: { type: 'error', code: 'missing', message: 'Not found.' } }, { id: 'm3', tool: 'lookup', input: { id: 3 }, outcome: { type: 'unexpected-response', value: { malformed: true } } }],
        assertions,
        graders: [{ id: 'g1', type: 'custom', name: 'projectCheck' }, { id: 'g2', type: 'rubric', rubric: { type: 'file', path: 'references/rubric.md' }, threshold: 0.8 }],
      }),
      validCase({ id: 'case-two', name: 'Multi turn', turns: [{ role: 'user', content: { type: 'inline', text: 'Hello.' } }, { role: 'assistant', content: 'How can I help?' }] }),
    ],
  });
}

function resultMock(id: string): Record<string, unknown> {
  return { id, tool: 'lookup', input: { id: 1 }, outcome: { type: 'result', value: { found: true } } };
}

function legacyVersionOne(): Record<string, unknown> {
  return { version: 1, kind: 'sibu-eval-suite', id: 'legacy', input: { prompt: 'legacy prompt' }, expected: 'static output', modelOptions: [{ id: 'old' }] };
}
