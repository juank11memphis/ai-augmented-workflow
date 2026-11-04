import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const scrum = readTemplate('skills/scrum-master-planner/SKILL.md');
const planner = readTemplate('skills/ai-implementation-planner/SKILL.md');
const executor = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');

type Target = 'feature:brd' | 'feature:sdd' | 'feature:ux' | 'epic:7' | 'story:42' | 'story:plan' | 'story:progress';
type WriteResult = 'confirmed' | 'uncertain';

class FakeMcp {
  readonly trace: string[] = [];
  readonly content = new Map<Target, string>();
  readonly capabilities = new Set(['native-subissue', 'issue-artifact']);
  nextWriteResult: WriteResult = 'confirmed';
  uncertainWriteTakesEffect = true;

  read(target: Target): string | undefined {
    this.trace.push(`read:${target}`);
    return this.content.get(target);
  }

  write(target: Target, value: string): WriteResult {
    this.trace.push(`write:${target}`);
    const result = this.nextWriteResult;
    if (result === 'confirmed' || this.uncertainWriteTakesEffect) this.content.set(target, value);
    return result;
  }

  has(capability: string): boolean {
    this.trace.push(`capability:${capability}`);
    return this.capabilities.has(capability);
  }
}

function readPublished(mcp: FakeMcp, targets: Target[]): boolean {
  for (const target of targets) {
    if (mcp.read(target) === undefined) return false;
  }
  return true;
}

function publishAfterReadback(mcp: FakeMcp, target: Target, expected: string): 'confirmed' | 'blocked' {
  const before = mcp.read(target);
  if (before !== undefined && before !== expected) return 'blocked';
  if (mcp.write(target, expected) === 'confirmed') return mcp.read(target) === expected ? 'confirmed' : 'blocked';
  const after = mcp.read(target);
  if (after === expected) return 'confirmed';
  if (after !== before) return 'blocked';
  // A retry is not attempted by this contract fixture: uncertainty remains a stop.
  return 'blocked';
}

function expectContract(template: string, phrases: string[]): void {
  for (const phrase of phrases) assert.ok(template.includes(phrase), `missing contract: ${phrase}`);
}

describe('GFW-S02-T03 selective reads and uncertain publication', () => {
  it('loads only confirmed published stage prerequisites into session, without local cache or repeated reads', () => {
    const mcp = new FakeMcp();
    mcp.content.set('feature:brd', 'published BRD');
    mcp.content.set('feature:sdd', 'published SDD');
    mcp.content.set('feature:ux', 'published UX');
    assert.equal(readPublished(mcp, ['feature:brd', 'feature:sdd', 'feature:ux']), true);
    assert.deepEqual(mcp.trace, ['read:feature:brd', 'read:feature:sdd', 'read:feature:ux']);
    assert.equal(mcp.trace.some((call) => call.startsWith('local-')), false);
    expectContract(scrum, ['published content', 'Read each unchanged prerequisite once', 'on-disk feature-artifact cache']);
    expectContract(planner, ['transient session context', 'Reuse unchanged session context', 'on-disk cache']);
    expectContract(executor, ['transient session context', 'reuse unchanged context', 'on-disk feature-artifact cache']);
  });

  it('stops before writes on missing content or native issue/artifact capability', () => {
    const missing = new FakeMcp();
    missing.content.set('feature:brd', 'published BRD');
    assert.equal(readPublished(missing, ['feature:brd', 'feature:sdd']), false);
    assert.deepEqual(missing.trace, ['read:feature:brd', 'read:feature:sdd']);

    const noHierarchy = new FakeMcp();
    noHierarchy.capabilities.delete('native-subissue');
    assert.equal(noHierarchy.has('native-subissue'), false);
    assert.deepEqual(noHierarchy.trace, ['capability:native-subissue']);

    const noArtifact = new FakeMcp();
    noArtifact.capabilities.delete('issue-artifact');
    assert.equal(noArtifact.has('issue-artifact'), false);
    assert.deepEqual(noArtifact.trace, ['capability:issue-artifact']);
    expectContract(scrum, ['native sub-issues', 'missing, stale, conflicting, or inaccessible']);
    expectContract(planner, ['Missing, stale, conflicting, or inaccessible prerequisites']);
    expectContract(executor, ['Missing, stale, conflicting, or inaccessible prerequisites']);
  });

  it('reads back uncertain issue and artifact writes and never blindly duplicates them', () => {
    for (const target of ['epic:7', 'story:42', 'story:plan', 'story:progress'] as Target[]) {
      const mcp = new FakeMcp();
      mcp.nextWriteResult = 'uncertain';
      assert.equal(publishAfterReadback(mcp, target, 'intended'), 'confirmed');
      assert.deepEqual(mcp.trace, [`read:${target}`, `write:${target}`, `read:${target}`]);
    }
    expectContract(scrum, ['After a confirmed response or an ambiguous response', 'If the intended effect is present, do not retry']);
    expectContract(planner, ['After a timeout or ambiguous update', 'confirmed match means no retry']);
    expectContract(executor, ['For an ambiguous issue or artifact write', 'must not be repeated']);
  });

  it('stops on stale or unresolved effects, reporting partial confirmation without downstream work', () => {
    const stale = new FakeMcp();
    stale.content.set('story:plan', 'other plan');
    assert.equal(publishAfterReadback(stale, 'story:plan', 'intended'), 'blocked');
    assert.deepEqual(stale.trace, ['read:story:plan']);

    const uncertain = new FakeMcp();
    uncertain.nextWriteResult = 'uncertain';
    uncertain.uncertainWriteTakesEffect = false;
    assert.equal(publishAfterReadback(uncertain, 'story:progress', 'intended'), 'blocked');
    assert.deepEqual(uncertain.trace, ['read:story:progress', 'write:story:progress', 'read:story:progress']);
    assert.equal(uncertain.trace.some((call) => /^(review|dispatch|local-write):/.test(call)), false);
    expectContract(scrum, ['Report confirmed Epic and Story effects separately from uncertain ones']);
    expectContract(planner, ['Report confirmed issue, plan-artifact, and progress-artifact effects separately']);
    expectContract(executor, ['Distinguish confirmed Story checklist, plan-artifact, and progress-artifact effects']);
  });
});
