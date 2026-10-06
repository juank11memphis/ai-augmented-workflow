import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSelectedFailureReader, type FailureSelection } from './selected-evidence.js';
import type { GetEvalRunResult } from '../get-eval-run/index.js';

const selection: FailureSelection = { suiteId: 'suite', runId: 'run-two', testCaseId: 'case', attempt: 2, assertionId: 'a2' };
const summary = {
  version: 1 as const, suiteId: 'suite', runId: 'run-two', caseIds: ['case'], scope: 'all' as const,
  testedModel: 'model', judgeModel: null, state: 'completed' as const,
  owner: { pid: 1, token: 'owner' }, createdAt: 1, updatedAt: 2, finishedAt: 2,
  outcome: 'failed' as const, calls: 2, cost: null, diagnostics: [],
  cases: [{ caseId: 'case', state: 'completed' as const, attempts: [
    { number: 1, outcome: 'passed' as const, durationMs: 1, calls: 1, cost: null },
    { number: 2, outcome: 'failed' as const, durationMs: 1, calls: 1, cost: null },
  ] }],
};
const evidence = {
  version: 1 as const, suiteId: 'suite', runId: 'run-two', caseId: 'case', number: 2,
  outcome: 'failed' as const, durationMs: 1, calls: 1, cost: null, output: '', truncated: false, diagnostics: [],
  turns: [{ id: 'linked', role: 'assistant' as const, content: 'selected turn' }],
  tools: [{ id: 'tool-linked', name: 'verify', arguments: 'selected args', result: 'selected result' }],
  assertions: [{ id: 'a2', kind: 'assertion' as const, outcome: 'failed' as const, score: null,
    expected: 'selected expected', actual: 'selected actual', diagnostics: ['selected diagnostic'],
    turnIds: ['linked'], toolIds: ['tool-linked'] }],
};

describe('createSelectedFailureReader', () => {
  it('requests one exact run/attempt/assertion and projects bounded linked evidence', async () => {
    const commands: unknown[] = [];
    const reader = createSelectedFailureReader(async command => {
      commands.push(command);
      return { status: 'ok', value: { summary, evidence, evidenceStatus: 'available' } };
    });
    const result = await reader.read(selection);
    assert.deepEqual(commands, [{ suiteId: 'suite', runId: 'run-two', selection: { caseId: 'case', attempt: 2, assertionId: 'a2' } }]);
    assert.equal(result.status, 'ready');
    assert.match(JSON.stringify(result), /selected actual|selected turn|selected args/);
    assert.doesNotMatch(JSON.stringify(result), /other run|other attempt|unlinked/);
  });
  it('blocks unavailable, mismatched, passed, and oversized evidence', async () => {
    const cases: GetEvalRunResult[] = [
      { status: 'blocked', reason: 'not-found' },
      { status: 'ok', value: { summary, evidenceStatus: 'unavailable' } },
      { status: 'ok', value: { summary, evidence: { ...evidence, runId: 'other-run' }, evidenceStatus: 'available' } },
      { status: 'ok', value: { summary, evidence: { ...evidence, assertions: [{ ...evidence.assertions[0]!, outcome: 'passed' }] }, evidenceStatus: 'available' } },
    ];
    for (const item of cases) assert.equal((await createSelectedFailureReader(async () => item).read(selection)).status, 'blocked');
    const huge = { ...evidence, assertions: [{ ...evidence.assertions[0]!, actual: 'x'.repeat(20_000) }] };
    const bounded = await createSelectedFailureReader(async () => ({ status: 'ok', value: { summary, evidence: huge, evidenceStatus: 'available' } })).read(selection);
    assert.equal(bounded.status, 'ready');
    if (bounded.status === 'ready') assert.ok(JSON.stringify(bounded.value.evidence).length < 5000);
  });
  it('keeps linked turns and tools at the item cap without leaking unrelated output', async () => {
    const turns = Array.from({ length: 8 }, (_, index) => ({ id: `turn-${index}`, role: 'assistant' as const, content: `linked turn ${index}` }));
    const tools = Array.from({ length: 8 }, (_, index) => ({ id: `tool-${index}`, name: 'verify', arguments: `linked args ${index}`, result: `linked result ${index}` }));
    const selected = { ...evidence, output: 'FULL ATTEMPT SECRET', turns: [...turns, { id: 'unlinked', role: 'assistant' as const, content: 'OTHER TRACE' }], tools,
      assertions: [{ ...evidence.assertions[0]!, turnIds: turns.map(item => item.id), toolIds: tools.map(item => item.id) }] };
    const reader = createSelectedFailureReader(async () => ({ status: 'ok', value: { summary, evidence: selected, evidenceStatus: 'available' } }));
    const result = await reader.read(selection);
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    const projected = result.value.evidence;
    assert.ok(projected.artifacts.some(item => item.label.startsWith('Turn')));
    assert.ok(projected.artifacts.some(item => item.label.startsWith('Tool')));
    assert.ok(projected.artifacts.length <= 6);
    assert.ok(JSON.stringify(projected).length <= 4_800);
    assert.match(JSON.stringify(projected), /truncated/);
    assert.doesNotMatch(JSON.stringify(projected), /FULL ATTEMPT SECRET|OTHER TRACE/);
    assert.deepEqual((await reader.read(selection)).status, 'ready');
  });
  it('reports missing linked evidence and bounds diagnostics, labels, and total serialization', async () => {
    const selected = { ...evidence, turns: [{ ...evidence.turns[0]!, content: '😀'.repeat(4_000) }],
      tools: [{ ...evidence.tools[0]!, name: 'N'.repeat(4_000), result: 'R'.repeat(4_000) }],
      assertions: [{ ...evidence.assertions[0]!, diagnostics: Array.from({ length: 12 }, (_, index) => `diagnostic ${index} ${'D'.repeat(2_000)}`),
        turnIds: ['linked', 'missing-turn'], toolIds: ['tool-linked', 'missing-tool'] }] };
    const reader = createSelectedFailureReader(async () => ({ status: 'ok', value: { summary, evidence: selected, evidenceStatus: 'available' } }));
    const result = await reader.read(selection);
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    const projected = result.value.evidence;
    assert.ok(projected.diagnostics.length <= 6);
    assert.match(JSON.stringify(projected.diagnostics), /Some linked trace evidence is unavailable|Selected evidence was truncated/);
    assert.ok(projected.artifacts.every(item => item.label.length <= 100));
    assert.ok(JSON.stringify(projected).length <= 4_800);
    assert.deepEqual((await reader.read(selection)).status, 'ready');
  });
  it('does not starve tool traces when diagnostics exhaust the shared serialization budget', async () => {
    const turns = Array.from({ length: 6 }, (_, index) => ({ id: `turn-${index}`, role: 'assistant' as const, content: 'T'.repeat(600) }));
    const tools = Array.from({ length: 6 }, (_, index) => ({ id: `tool-${index}`, name: 'N'.repeat(500),
      arguments: 'A'.repeat(600), result: 'R'.repeat(600) }));
    const selected = { ...evidence, turns, tools, assertions: [{ ...evidence.assertions[0]!,
      actual: 'X'.repeat(600), expected: 'Y'.repeat(600), diagnostics: Array.from({ length: 6 }, () => 'D'.repeat(600)),
      turnIds: turns.map(item => item.id), toolIds: tools.map(item => item.id) }] };
    const result = await createSelectedFailureReader(async () => ({ status: 'ok', value: { summary, evidence: selected, evidenceStatus: 'available' } })).read(selection);
    assert.equal(result.status, 'ready');
    if (result.status !== 'ready') return;
    assert.ok(result.value.evidence.artifacts.some(item => item.label.startsWith('Turn ')));
    assert.ok(result.value.evidence.artifacts.some(item => item.label.startsWith('Tool ')));
    assert.ok(result.value.evidence.artifacts.some(item => item.label.startsWith('Turn ') && item.preview?.includes('TTTT')));
    assert.ok(result.value.evidence.artifacts.some(item => item.label.startsWith('Tool ') && item.preview?.includes('AAAA') && item.preview?.includes('RRRR')));
    assert.match(JSON.stringify(result.value.evidence.diagnostics), /truncated/);
    assert.ok(JSON.stringify(result.value.evidence).length <= 4_800);
  });
});
