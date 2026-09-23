import assert from 'node:assert/strict';
import { it } from 'node:test';
import { loadModelRecommendationCatalog } from '../../modules/template-catalog/model-routing.js';
import type { ModelsTerminal } from './models-guided-flow.js';
import { runModelsGuidedFlow } from './models-guided-flow.js';

const catalog = loadModelRecommendationCatalog();
const stateBasis = 'a'.repeat(64);
const recommendation = catalog.recommendations[0];
const route = { ...recommendation, origin: 'user-selected' as const, catalogVersionAtSelection: 'old', selectedAt: 'now' };

function fixture(answers: string[], configured = true, width = 40) {
  const output: string[] = [];
  const terminal: ModelsTerminal = {
    width, write: (line) => output.push(line), ask: async () => answers.shift() ?? null, close: () => undefined,
  };
  let writes = 0;
  const operations = {
    list: () => ({ status: 'listed' as const, catalogVersion: catalog.catalogVersion, stateBasis,
      routes: catalog.recommendations.map((entry, index) => ({ recommendation: entry, route: configured && index === 0 ? route : null,
        status: configured && index === 0 ? 'recommended' as const : 'not-configured' as const, reviewNeeded: configured && index === 0 })) }),
    set: () => { writes++; return { status: 'saved' as const, route, recovery: null }; },
    reset: () => { writes++; return { status: 'completed' as const, completed: [recommendation] }; },
  };
  return { terminal, operations, output, get writes() { return writes; } };
}

it('keeps binding route/menu option order, labels, narrow wrapping, and back without mutation', async () => {
  const test = fixture(['1', '4', '20']);
  await runModelsGuidedFlow(test.terminal, test.operations);
  const text = test.output.join('\n');
  assert.match(text, /Model routes\n\nWhich route would you like to review/);
  assert.match(text, /19\. Reset routes\n20\. Exit/);
  assert.match(text, /Current: GPT-6 Luna \/ low\nStatus: Recommended · Review current\n   recommendation/);
  assert.match(text, /1\. Keep current\n2\. Choose another\n3\. Reset to current recommendation\n4\. Back/);
  assert.ok(test.output.every((line) => line.length <= 40));
  assert.equal(test.writes, 0);
});

it('requires deliberate all reset and supports missing-route selection', async () => {
  const cancelled = fixture(['19', '', '20']);
  await runModelsGuidedFlow(cancelled.terminal, cancelled.operations);
  assert.equal(cancelled.writes, 0);
  assert.match(cancelled.output.join('\n'), /No routes were changed/);
  const missing = fixture(['1', '1', '20'], false);
  await runModelsGuidedFlow(missing.terminal, missing.operations);
  assert.equal(missing.writes, 1);
  assert.match(missing.output.join('\n'), /Current: Not configured/);
});

it('accepts catalog-external model and reports partial reset without claiming success', async () => {
  const external = fixture(['1', '2', '2', 'outside-catalog', 'high', '20']);
  const selected: string[] = [];
  const operations = { ...external.operations, set: (command: { model: string; reasoningEffort: string }) => {
    selected.push(`${command.model}/${command.reasoningEffort}`);
    return { status: 'saved' as const, route: { ...route, model: command.model, reasoningEffort: 'high' as const, origin: 'user-selected' as const }, recovery: null };
  } };
  await runModelsGuidedFlow(external.terminal, operations);
  assert.deepEqual(selected, ['outside-catalog/high']);
  assert.match(external.output.join('\n'), /User selected\./);
  const partial = fixture(['19', 'RESET ALL', '20']);
  await runModelsGuidedFlow(partial.terminal, { ...partial.operations, reset: () => ({ status: 'failed' as const,
    completed: [recommendation], failed: catalog.recommendations[1], notAttempted: catalog.recommendations.slice(2), recovery: 'Retry after checking workflow state.' }) });
  const report = partial.output.join('\n');
  assert.match(report, /Completed: 1 route\.\n  Implementation planner · bounded/);
  assert.match(report, /Failed: Implementation planner ·\n   demanding\./);
  assert.match(report, /Not attempted: 16 routes\./);
  assert.match(report, /  Implementation planner · high-risk/);
  assert.match(report, /  Notion exporter · high-risk/);
  assert.ok(partial.output.every((line) => line.length <= 40));
});

it('shows saved routes without recommendations and permits no mutation', async () => {
  const test = fixture(['1']);
  await runModelsGuidedFlow(test.terminal, { ...test.operations, list: () => ({ status: 'recommendation-unavailable' as const,
    savedRoutes: [route], recovery: 'Restore the Sibu recommendation catalog before changing routes.' }) });
  assert.match(test.output.join('\n'), /Saved model routes\n\nImplementation planner · bounded\n   GPT-6 Luna \/ low · Recommendation\n   unavailable/);
  assert.equal(test.writes, 0);
});

it('keeps conflict status and route identity in a partial reset report', async () => {
  const test = fixture(['19', 'RESET ALL', '20']);
  await runModelsGuidedFlow(test.terminal, { ...test.operations, reset: () => ({ status: 'conflict' as const,
    completed: [recommendation], failed: catalog.recommendations[1], notAttempted: catalog.recommendations.slice(2),
    recovery: 'Review routes again before retrying.' }) });
  assert.match(test.output.join('\n'), /Conflict: Implementation planner ·\n   demanding\./);
  assert.match(test.output.join('\n'), /Review routes again before retrying\./);
});

it('wraps long identifiers without truncating even below 20 columns', async () => {
  const longModel = 'provider-model-with-a-very-long-unbroken-identifier';
  for (const width of [8, 15, 19]) {
    const test = fixture(['20'], true, width);
    const longRoute = { ...route, model: longModel };
    await runModelsGuidedFlow(test.terminal, { ...test.operations, list: () => ({ status: 'listed' as const,
      catalogVersion: catalog.catalogVersion, stateBasis,
      routes: catalog.recommendations.map((entry, index) => ({ recommendation: entry, route: index === 0 ? longRoute : null,
        status: index === 0 ? 'user-selected' as const : 'not-configured' as const, reviewNeeded: false })) }) });
    assert.ok(test.output.every((line) => line.length <= width), `width ${width}`);
    assert.ok(test.output.map((line) => line.trim()).join('').includes(longModel), `identifier survives width ${width}`);
  }
});
