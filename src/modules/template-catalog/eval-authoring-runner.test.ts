import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
const { command, fixtureModules, invoke, project, suite } = await import(
  new URL('../../../src/modules/template-catalog/fixtures/eval-authoring/test-support.mjs', import.meta.url).href
) as typeof import('./fixtures/eval-authoring/test-support.mjs');

test('describe and estimate are side-effect-free and identify separate models/call costs', async () => {
  const { handleRequest, createTestPorts } = await fixtureModules();
  const fixture = createTestPorts();
  const cases = (await suite()).testCases;
  const description = await handleRequest({ protocolVersion: 1, requestId: 'describe-1', operation: 'describe' }, fixture.ports);
  assert.deepEqual(description.events[0]?.data.models, ['fake/target']);
  assert.deepEqual(description.events[0]?.data.judgeModels, ['fake/judge']);
  const estimate = await handleRequest(command(cases, 'estimate', 2), fixture.ports);
  assert.deepEqual(estimate.events[0]?.data, { targetCalls: 10, judgeCalls: 2, totalCalls: 12, cost: { status: 'unavailable', reason: 'Synthetic fixture has no provider pricing.' } });
  assert.deepEqual(fixture.counts, { target: 0, model: 0, judge: 0, production: 0 });
});

test('bounded case/repeat/turn invariants preserve selected order, identity and state isolation', async () => {
  const { handleRequest, createTestPorts } = await fixtureModules();
  const cases = (await suite()).testCases;
  for (const count of [1, 2, 4]) for (const repeats of [1, 2, 3]) {
    const selected = cases.slice(0, count).reverse();
    const fixture = createTestPorts();
    const result = await handleRequest(command(selected, 'execute', repeats), fixture.ports);
    assert.equal(result.status, 'completed');
    assert.equal(result.events[0]?.type, 'run-started');
    assert.equal(result.events.at(-1)?.type, 'run-completed');
    assert.deepEqual(result.events.filter((event) => event.type === 'case-attempt-started').map((event) => [event.caseId, event.attempt]), selected.flatMap((item) => Array.from({ length: repeats }, (_, index) => [item.id, index + 1])));
    assert.deepEqual(fixture.observations.historyLengths, selected.flatMap((item) => Array.from({ length: repeats }, () => item.turns.map((_, index) => index * 2 + 1)).flat()));
    result.events.forEach((event, index) => {
      assert.equal(event.sequence, index); assert.equal(event.runId, 'run-1'); assert.equal(event.requestId, 'request-1');
      if (!['run-started', 'run-completed'].includes(event.type)) { assert.ok(event.caseId); assert.ok(event.attempt); }
    });
    assert.equal(fixture.counts.model, selected.reduce((count, item) => count + item.turns.length, 0) * repeats);
    assert.ok(fixture.observations.models.every((model) => model === 'fake/target'));
    assert.equal(fixture.counts.production, 0);
    assert.equal(result.events.filter((event) => event.type === 'case-attempt-completed').length, count * repeats);
  }
});

test('target dispatch records exact tool order, arguments and all mock outcomes without production calls', async () => {
  const { handleRequest, createTestPorts } = await fixtureModules();
  const item = (await suite()).testCases[2]!;
  const fixture = createTestPorts();
  const result = await handleRequest(command([item]), fixture.ports);
  assert.equal(result.status, 'completed');
  const traces = result.events.filter((event) => event.type === 'tool-interaction-recorded');
  assert.deepEqual(traces.map((event) => event.data), item.toolMocks.map((mock, position) => ({ position, tool: mock.tool, arguments: mock.input, outcome: mock.outcome })));
  assert.match(String(result.events.find((event) => event.type === 'conversation-turn-completed')?.data.output), /result,error,unexpected-response/);
  assert.equal(fixture.counts.production, 0);
});

test('undeclared, mismatched, extra and out-of-order calls fail closed; bypass sentinel is sensitive', async () => {
  const { handleRequest, createTestPorts } = await fixtureModules();
  const item = (await suite()).testCases[2]!;
  for (const toolMocks of [[], item.toolMocks.slice(0, 1), [...item.toolMocks].reverse(), [{ ...item.toolMocks[0]!, input: { id: 'mismatch' } }]]) {
    const fixture = createTestPorts();
    const result = await handleRequest(command([{ ...item, toolMocks }]), fixture.ports);
    assert.equal(result.status, 'error');
    assert.equal(fixture.counts.production, 0);
    assert.ok(result.events.some((event) => event.type === 'run-diagnostic'));
    assert.deepEqual(result.events.at(-1)?.data, { status: 'error' });
  }
  const bypass = createTestPorts({ bypassMocks: true });
  assert.equal((await handleRequest(command([item]), bypass.ports)).status, 'error');
  assert.throws(() => assert.equal(bypass.counts.production, 0), /1 !== 0/);
});

test('custom/rubric results retain judge identity, inspectable threshold and bounded evidence', async () => {
  const { handleRequest, createTestPorts } = await fixtureModules();
  const item = (await suite()).testCases[3]!;
  for (const score of [0.7, 0.8, 0.9]) {
    const fixture = createTestPorts({ score });
    const result = await handleRequest(command([item]), fixture.ports);
    const rubric = result.events.find((event) => event.type === 'rubric-judgment-completed')!.data;
    assert.equal(rubric.score, score); assert.equal(rubric.threshold, 0.8); assert.equal(rubric.passed, score >= 0.8);
    assert.equal(rubric.judgeModel, 'fake/judge'); assert.deepEqual(fixture.observations.judges, ['fake/judge']);
    assert.equal(result.events.find((event) => event.type === 'custom-assertion-completed')?.data.passed, true);
    assert.ok(String(rubric.evidence).length < 2048);
  }
  const fixture = createTestPorts();
  assert.equal((await handleRequest({ ...command([item]), judgeModel: null }, fixture.ports)).status, 'error');
  assert.equal(fixture.counts.model, 0);
});

test('local fixture process implements all operations with pure NDJSON and unchanged target bytes', async (t) => {
  const root = await project(t);
  const before = await fs.readFile(path.join(root, 'project-target.mjs'));
  const cases = (await suite()).testCases;
  for (const request of [{ protocolVersion: 1, requestId: 'describe-1', operation: 'describe' }, command(cases, 'estimate'), command(cases, 'execute', 2)]) {
    const result = await invoke(root, request);
    assert.equal(result.code, 0); assert.equal(result.stderr, '');
    assert.ok(result.events.length > 0);
    result.events.forEach((event, index) => assert.equal(event.sequence, index));
  }
  assert.deepEqual(await fs.readFile(path.join(root, 'project-target.mjs')), before);
  await assert.rejects(fs.access(path.join(root, 'evals/artifacts')));
});
