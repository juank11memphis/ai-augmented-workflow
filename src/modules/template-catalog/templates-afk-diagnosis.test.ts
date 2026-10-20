import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const guidance = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const start = guidance.indexOf('### AFK blocked-check diagnosis before recovery');
const end = guidance.indexOf('### AFK recovery for a post-commit evidence gap', start);
assert.ok(start >= 0 && end > start, 'diagnosis precedes recovery');
const diagnosis = guidance.slice(start, end);

type Failure = {
  assertion: string;
  check: string;
  observedHead: string;
  group: string;
  task: string;
  contract: string;
  paths: string[];
  locator: string;
};

function inventory(failures: Failure[]): Map<string, Failure[]> {
  const grouped = new Map<string, Failure[]>();
  for (const failure of failures) {
    assert.ok(failure.assertion && failure.check && failure.observedHead);
    assert.ok(failure.group && failure.task && failure.contract);
    assert.ok(failure.paths.length > 0 && failure.locator);
    grouped.set(failure.group, [...(grouped.get(failure.group) ?? []), failure]);
  }
  return grouped;
}

function classify(storyFailed: boolean, baselineFailed: boolean | null, environmentFailure: boolean): string {
  if (environmentFailure) return 'host/test-runner failure';
  if (!storyFailed || baselineFailed === null) return 'unresolved';
  return baselineFailed ? 'pre-existing failure' : 'active-Story regression';
}

describe('AFK blocked-check diagnosis written contract and disposable scenarios', () => {
  it('requires complete grouped inventory before attribution for multiple distinct failures', () => {
    const failures: Failure[] = [
      { assertion: 'parse preserves ID', check: 'pnpm verify', observedHead: 'story-a', group: 'parser', task: 'T01', contract: 'ID preserved', paths: ['src/parser.ts'], locator: 'test report case 1' },
      { assertion: 'sync protects customization', check: 'pnpm verify', observedHead: 'story-a', group: 'sync', task: 'T02', contract: 'customized bytes preserved', paths: ['src/sync.ts'], locator: 'test report case 2' },
    ];
    assert.deepEqual([...inventory(failures).keys()], ['parser', 'sync']);
    for (const field of ['each failing case or assertion', 'check identity and observed check head', 'likely-cause group', 'affected Task', 'expected contract', 'owning paths', 'safe evidence locator', 'observed Story head and Epic/base head']) {
      assert.ok(diagnosis.includes(field), `missing ${field}`);
    }
    assert.ok(diagnosis.indexOf('complete, compact failure inventory') < diagnosis.indexOf('For each inventoried focused failure'));
    assert.match(diagnosis, /Do not expose secrets, raw private logs, or large payloads/);
  });

  it('requires read-only retrieval and an incomplete-evidence stop for truncated output', () => {
    const observed = { count: 3, detailedCases: ['case 1'] };
    assert.ok(observed.detailedCases.length < observed.count);
    assert.match(diagnosis, /failure count or truncated output is not a diagnosis/);
    assert.match(diagnosis, /focused \*\*read-only\*\* inspection/);
    assert.match(diagnosis, /mark the inventory `incomplete`, name the missing evidence, and stop attribution and repair selection/);
  });

  it('distinguishes isolated Epic-head baseline outcomes with evidence and uncertainty', () => {
    assert.equal(classify(true, false, false), 'active-Story regression');
    assert.equal(classify(true, true, false), 'pre-existing failure');
    assert.equal(classify(true, null, true), 'host/test-runner failure');
    assert.equal(classify(true, null, false), 'unresolved');
    for (const outcome of ['active-Story regression', 'pre-existing failure', 'host/test-runner failure', 'unresolved']) {
      assert.ok(diagnosis.includes(outcome));
    }
    assert.match(diagnosis, /observed Epic\/base head/);
    assert.match(diagnosis, /safe isolation from the blocked Task's uncommitted edits/);
    assert.match(diagnosis, /baseline command\/result, head, safe evidence locator, and uncertainty/);
    assert.match(diagnosis, /failed check alone never establishes the class/);
  });

  it('stops for changed heads, unsafe isolation, or absent attribution evidence', () => {
    const scenarios = [
      { storyBefore: 'a', storyAfter: 'b', epicBefore: 'e', epicAfter: 'e', isolated: true, evidence: true },
      { storyBefore: 'a', storyAfter: 'a', epicBefore: 'e', epicAfter: 'f', isolated: true, evidence: true },
      { storyBefore: 'a', storyAfter: 'a', epicBefore: 'e', epicAfter: 'e', isolated: false, evidence: true },
      { storyBefore: 'a', storyAfter: 'a', epicBefore: 'e', epicAfter: 'e', isolated: true, evidence: false },
    ];
    for (const scenario of scenarios) {
      assert.ok(scenario.storyBefore !== scenario.storyAfter || scenario.epicBefore !== scenario.epicAfter || !scenario.isolated || !scenario.evidence);
    }
    assert.match(diagnosis, /Recheck both observed Story and Epic\/base heads before acting/);
    assert.match(diagnosis, /If either head changed, isolation cannot preserve blocked edits, a comparable baseline cannot be obtained, or attribution evidence is absent or contradictory/);
    assert.match(diagnosis, /focused human stop naming the missing fact or decision/);
    assert.match(diagnosis, /Do not claim a repair route from partial or unstable evidence/);
    assert.match(diagnosis, /never stash, reset, overwrite blocked edits, edit the Epic branch, or repair on the Epic branch/);
  });
});
