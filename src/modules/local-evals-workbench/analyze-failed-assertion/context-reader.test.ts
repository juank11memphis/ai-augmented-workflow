import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalysisContextReader } from './context-reader.js';
import type { AnalyzeFailedAssertionCommand } from './command.js';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';

const command: AnalyzeFailedAssertionCommand = { projectRoot: '/project', suiteId: 'suite', runId: 'run', attempt: 1,
  testCaseId: 'selected', assertionId: 'safe-disposition', evalRunModelId: 'fake/model', runScope: { type: 'all' } };
const suite: NormalizedEvalSuite = {
  version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: '',
  target: { id: 'target', kind: 'integration', path: 'src/target.ts' },
  coverage: { categories: [], gaps: [] }, runner: { command: ['node', 'evals/runner.ts'], requiredEnvironment: [] },
  testCases: [{ id: 'selected', name: 'Selected', turns: [{ role: 'user', content: { type: 'inline', text: 'Sunday hours?' } }],
    fixture: { type: 'inline', value: { knowledge: 'No approved Sunday hours.' } }, toolMocks: [],
    assertions: [{ id: 'safe-disposition', type: 'json-schema', schema: { type: 'object', properties: { kind: { enum: ['clarify', 'handoff'] } } } }], graders: [] },
  { id: 'other', name: 'Other', turns: [{ role: 'user', content: { type: 'inline', text: 'PRIVATE OTHER CASE' } }],
    toolMocks: [], assertions: [{ id: 'other-check', type: 'output-contains', expected: 'other' }], graders: [] }],
};

test('selects only current matching case, fixture, check, target and explicit local prompt', async () => {
  const paths: string[] = [];
  const reader = createAnalysisContextReader({ loadSuite: async () => suite,
    resolve: async cases => ({ status: 'ready', value: cases }),
    readFile: async relative => { paths.push(relative);
      const content = relative === 'src/target.ts' ? 'const prompt = new URL("./prompts/system.md", import.meta.url);'
        : 'Use approved knowledge; do not invent Sunday hours.';
      return { status: 'ok', value: { status: 'present', path: relative, digest: 'digest', content, preview: content } };
    } });
  const context = await reader.read(command);
  assert.deepEqual(paths, ['src/target.ts', 'src/prompts/system.md']);
  assert.deepEqual(context.excerpts.map(item => item.source), ['Case input', 'Fixture', 'Selected check', 'Target source', 'Target prompt']);
  assert.deepEqual(context.missing, []);
  assert.match(JSON.stringify(context), /Sunday hours\?|No approved Sunday hours|clarify|Target prompt/);
  assert.doesNotMatch(JSON.stringify(context), /PRIVATE OTHER CASE/);
});

test('omits unsafe or oversized context rather than sending it to assistance', async () => {
  const unsafe = { ...suite, testCases: [{ ...suite.testCases[0]!, fixture: { type: 'inline' as const,
    value: { credentials: 'OPENAI_API_KEY=privatevalue123456' } } }] };
  const reader = createAnalysisContextReader({ loadSuite: async () => unsafe,
    resolve: async cases => ({ status: 'ready', value: cases }),
    readFile: async relative => ({ status: 'ok', value: { status: 'present', path: relative, digest: 'digest',
      content: 'x'.repeat(40_000), preview: '' } }) });
  const context = await reader.read(command);
  assert.ok(context.missing.includes('Fixture'));
  assert.ok(context.missing.includes('Target prompt'));
  assert.doesNotMatch(JSON.stringify(context), /privatevalue123456|x{1001}/);
});

test('rejects stale case or check identity before reading any project file', async () => {
  let reads = 0;
  const reader = createAnalysisContextReader({ loadSuite: async () => suite,
    resolve: async cases => ({ status: 'ready', value: cases }),
    readFile: async () => { reads++; return { status: 'blocked', reason: 'unsafe-path' }; } });
  const context = await reader.read({ ...command, assertionId: 'other-check' });
  assert.equal(context.excerpts.length, 0);
  assert.equal(reads, 0);
});
