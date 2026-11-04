import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readTemplate, readTemplateManifest } from './index.js';

const reviewerPath = 'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md';
const gatekeeperPath = 'skills/ai-implementation-plan-executor/SKILL.md';
const executorPath = 'skills/ai-implementation-executor-toolbox/SKILL.md';
const reviewer = readTemplate(reviewerPath);
const gatekeeper = readTemplate(gatekeeperPath);
const executor = readTemplate(executorPath);

// Hand-written scenarios describe the intended contract; they do not simulate an agent.
const strategy = {
  method: 'local acceptance check',
  coverage: 'duplicate import and rollback',
  evidence: 'passing fixture output and inspected rollback record',
  humanLimit: 'a reviewer judges whether the rollback record is understandable',
  exclusion: 'no live bank call',
};

const sourceAlignedPlan = `
Method: ${strategy.method}; coverage: ${strategy.coverage};
Expected evidence: ${strategy.evidence}; human limit: ${strategy.humanLimit};
Exclusion: ${strategy.exclusion}.
Task check: node --test bin/import/rollback.test.js.
Done when: duplicate import and rollback assertions pass; rollback record is inspected.
`;

describe('review and checked execution verification contract (not agent behavior)', () => {




  it('versions all three changed templates with current user-facing notes', () => {
    const manifest = readTemplateManifest();
    for (const path of [reviewerPath, gatekeeperPath, executorPath]) {
      const entry = manifest.templates[path];
      assert.ok(entry, path);
      assert.equal(entry.changes.length, 1);
      assert.ok(entry.changes[0]?.length > 30);
    }
  });
});
