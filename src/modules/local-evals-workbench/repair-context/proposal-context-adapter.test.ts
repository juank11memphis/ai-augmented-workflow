import assert from 'node:assert/strict';
import test from 'node:test';
import { namedProposalContext } from './proposal-context-adapter.js';
import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/suite-contract.js';
import type { DraftEvalRepairProposalCommand } from '../draft-eval-repair-proposal/command.js';

const suite = { id: 'suite', target: { path: 'prompts/agent.md' }, testCases: [
  { id: 'case', fixture: { type: 'file', path: 'fixtures/input.json' } },
] } as unknown as NormalizedEvalSuite;
const command = { suiteId: 'suite', testCaseId: 'case', repairDirection: { type: 'prompt_issue' } } as DraftEvalRepairProposalCommand;

test('uses validated source and declared target/fixture paths, never guessed IDs', () => {
  assert.deepEqual(namedProposalContext([suite], { suite: 'evals/actual-name.json' }, command), { status: 'ready', paths: ['prompts/agent.md'] });
  assert.deepEqual(namedProposalContext([suite], { suite: 'evals/actual-name.json' }, { ...command, repairDirection: { type: 'eval_assertion_issue' } }), { status: 'ready', paths: ['evals/actual-name.json'] });
  assert.deepEqual(namedProposalContext([suite], { suite: 'evals/actual-name.json' }, { ...command, repairDirection: { type: 'fixture_input_issue' } }), { status: 'ready', paths: ['evals/fixtures/input.json', 'evals/actual-name.json'] });
  assert.equal(namedProposalContext([suite], {}, command).status, 'blocked');
  assert.equal(namedProposalContext([suite], { suite: 'evals/../wrong.json' }, command).status, 'blocked');
});
