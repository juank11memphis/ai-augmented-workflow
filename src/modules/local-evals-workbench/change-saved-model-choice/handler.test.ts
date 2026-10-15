import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { changeSavedModelChoice } from './handler.js';
import type { ChangeSavedModelChoicePorts } from './ports.js';

const suite = { id: 'suite', version: 2, kind: 'sibu-eval-suite', testCases: [] } as unknown as NormalizedEvalSuite;
const token = 'a'.repeat(64);
function ports() {
  const saves: unknown[] = [];
  const dependencies: ChangeSavedModelChoicePorts = {
    files: { read: async () => ({ suite, token }), save: async (...args) => {
      saves.push(args);
      return { status: 'saved', suiteId: 'suite', role: args[1], modelId: args[2], token: 'b'.repeat(64) };
    } },
    runner: { describe: async () => ({ status: 'ready', value: { runnerId: 'runner', capabilities: [], models: ['X', 'Y'], judgeModels: ['J', 'K'], requiredEnvironment: [] } }) },
  };
  return { dependencies, saves };
}

it('sets, changes, and resets either independent suite role through the port', async () => {
  const { dependencies, saves } = ports();
  for (const [role, models] of [['tested', ['X', 'Y']], ['judge', ['J', 'K']]] as const) {
    for (const modelId of models) assert.equal((await changeSavedModelChoice({ suiteId: 'suite', role, action: 'set', modelId, expectedToken: token }, dependencies)).status, 'saved');
    assert.equal((await changeSavedModelChoice({ suiteId: 'suite', role, action: 'reset', expectedToken: token }, dependencies)).status, 'saved');
  }
  assert.deepEqual(saves.map(item => (item as unknown[]).slice(1, 3)), [['tested', 'X'], ['tested', 'Y'], ['tested', null], ['judge', 'J'], ['judge', 'K'], ['judge', null]]);
});

it('blocks incompatible, stale, and no-save input without any write', async () => {
  const { dependencies, saves } = ports();
  assert.deepEqual(await changeSavedModelChoice({ suiteId: 'suite', role: 'tested', action: 'set', modelId: 'Z', expectedToken: token }, dependencies), { status: 'blocked', reason: 'model-unavailable' });
  assert.deepEqual(await changeSavedModelChoice({ suiteId: 'suite', role: 'judge', action: 'set', modelId: 'J', expectedToken: 'b'.repeat(64) }, dependencies), { status: 'conflict', reason: 'suite-changed' });
  assert.deepEqual(await changeSavedModelChoice({ suiteId: 'suite', role: 'tested', action: 'set', modelId: 'sk-secret\n', expectedToken: token }, dependencies), { status: 'blocked', reason: 'invalid-request' });
  assert.equal(saves.length, 0);
});
