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
  it('finds bounded source-aligned omissions but stops for unresolved material strategy changes', () => {
    assert.match(reviewer, /Compare the exact plan's methods, coverage, scenarios\/surfaces\/states, expected evidence, human-judgment limits, and material exclusions/);
    assert.match(reviewer, /omitted required method, unsupported substitution, or hidden human judgment is an actionable finding when a bounded source-aligned correction is known/);
    assert.match(reviewer, /materially change the confirmed strategy, cost, dependency, or human ownership, report an unresolved material risk/);
    assert.match(gatekeeper, /bounded source-aligned fix goes through the existing planner revision and fresh-review loop/);
    assert.match(gatekeeper, /request engineer-directed SDD revision before planning or executing the changed path/);

    const omittedMethod = sourceAlignedPlan.replace(`Method: ${strategy.method}; `, 'Method: lint only; ');
    assert.ok(!omittedMethod.includes(`Method: ${strategy.method}`));
    assert.ok(sourceAlignedPlan.includes(`Method: ${strategy.method}`));
    assert.ok(sourceAlignedPlan.includes(strategy.coverage));
    assert.ok(sourceAlignedPlan.includes(strategy.evidence));
    assert.ok(sourceAlignedPlan.includes(strategy.humanLimit));
    assert.ok(sourceAlignedPlan.includes(strategy.exclusion));
  });

  it('keeps clean independent review on the automatic path without routine human acceptance', () => {
    assert.match(gatekeeper, /no findings in any required category and no unresolved risks[\s\S]*accepts that exact identity automatically/);
    assert.match(gatekeeper, /do not ask for human plan approval/);
    assert.match(gatekeeper, /not a routine human plan gate/);
    assert.match(reviewer, /Do not return an approval verdict for execution/);
    assert.match(gatekeeper, /Never treat a prior packet as review of a revised plan/);
  });

  it('separates ordinary failed-check recovery from strategy departure', () => {
    assert.match(executor, /A failed prescribed check remains a failed check under the bounded fix or reviewed same-Story regression path/);
    assert.match(executor, /not by itself verification-strategy drift/);
    assert.match(executor, /make at most \*\*two\*\* evidence-guided, in-scope fixes/);
    assert.match(executor, /materially infeasible or insufficient[\s\S]*meaningful new cost, external dependency, or human judgment/);
    assert.match(executor, /Report the precise difference, consequence, and smallest engineer decision needed/);
    assert.match(executor, /Never silently replace the check, edit the SDD, or write approval metadata/);
    assert.match(executor, /If classification is ambiguous, stop/);
  });

  it('requires actual prescribed-check and every Done when item, not exit zero alone', () => {
    assert.match(executor, /Run the exact prescribed check after implementation/);
    assert.match(executor, /actual tests, assertions, and results with \*\*each\*\* Task `Done when` item and expected evidence/);
    assert.match(executor, /command exit zero alone does not complete the Task/);
    assert.match(gatekeeper, /every planned `Done when` item has evidence/);
    assert.ok(sourceAlignedPlan.includes('Task check: node --test bin/import/rollback.test.js'));
    assert.ok(sourceAlignedPlan.includes('Done when: duplicate import and rollback assertions pass'));
    const noInspection = 'duplicate import and rollback assertions pass';
    assert.ok(!noInspection.includes('rollback record is inspected'));
  });

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
