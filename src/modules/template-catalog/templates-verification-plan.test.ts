import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const plannerPath = 'skills/ai-implementation-planner/SKILL.md';
const toolboxPath = 'skills/ai-implementation-planner-toolbox/SKILL.md';
const planner = readTemplate(plannerPath);
const toolbox = readTemplate(toolboxPath);

// Hand-written handoff examples check the policy boundary, not agent behavior.
const strategy = {
  method: 'local acceptance check',
  coverage: 'duplicate import and rollback',
  evidence: 'passing fixture output and inspected rollback record',
  humanLimit: 'reviewer judges whether the record is understandable',
  exclusion: 'no live bank call',
};

const taskCheck = `
Task check: node --test bin/import/rollback.test.js;
method: ${strategy.method}; coverage: ${strategy.coverage};
expected evidence: ${strategy.evidence};
human limit: ${strategy.humanLimit}; exclusion: ${strategy.exclusion}.
`;

type HandoffCase = {
  name: string;
  proposedCheck: string;
  preservesMethod: boolean;
  preservesCoverage: boolean;
  introducesMaterialConstraint: boolean;
  expected: 'routine' | 'stop';
};

const handoffs: HandoffCase[] = [
  {
    name: 'exact local command',
    proposedCheck: 'node --test bin/import/rollback.test.js',
    preservesMethod: true,
    preservesCoverage: true,
    introducesMaterialConstraint: false,
    expected: 'routine',
  },
  {
    name: 'equivalent local fixture check',
    proposedCheck: 'pnpm test:import-fixture',
    preservesMethod: true,
    preservesCoverage: true,
    introducesMaterialConstraint: false,
    expected: 'routine',
  },
  {
    name: 'non-equivalent substitution',
    proposedCheck: 'lint only; no duplicate-import rollback assertion',
    preservesMethod: false,
    preservesCoverage: false,
    introducesMaterialConstraint: false,
    expected: 'stop',
  },
  {
    name: 'unavailable method without equivalent',
    proposedCheck: 'local acceptance runner unavailable; no equivalent check',
    preservesMethod: false,
    preservesCoverage: false,
    introducesMaterialConstraint: false,
    expected: 'stop',
  },
  {
    name: 'new external expense and dependency',
    proposedCheck: 'paid hosted bank sandbox requiring new SDK',
    preservesMethod: true,
    preservesCoverage: true,
    introducesMaterialConstraint: true,
    expected: 'stop',
  },
  {
    name: 'new human judgment',
    proposedCheck: 'engineer manually judges rollback correctness',
    preservesMethod: true,
    preservesCoverage: true,
    introducesMaterialConstraint: true,
    expected: 'stop',
  },
];

describe('planner verification handoff contract (not model behavior)', () => {

  it('distinguishes routine exact or equivalent selection from material fixture cases', () => {
    const routine = handoffs.filter((entry) => entry.expected === 'routine');
    const stopped = handoffs.filter((entry) => entry.expected === 'stop');
    assert.deepEqual(routine.map((entry) => entry.name), [
      'exact local command', 'equivalent local fixture check',
    ]);
    assert.deepEqual(stopped.map((entry) => entry.name), [
      'non-equivalent substitution', 'unavailable method without equivalent',
      'new external expense and dependency', 'new human judgment',
    ]);
    for (const entry of handoffs) {
      assert.ok(entry.proposedCheck, entry.name);
      assert.equal(
        entry.expected,
        entry.preservesMethod && entry.preservesCoverage && !entry.introducesMaterialConstraint
          ? 'routine' : 'stop',
        entry.name,
      );
    }
  });

});
