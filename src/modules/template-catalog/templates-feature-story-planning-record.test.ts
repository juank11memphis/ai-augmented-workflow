import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const planner = readTemplate('skills/ai-implementation-planner/SKILL.md');
const executor = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');

const repository = 'owner/project';
const storyIssue = 42;
const planArtifact = 'artifact-plan-42';
const progressArtifact = 'artifact-progress-42';
const sourceArtifacts = ['epic-7', 'brd-1', 'sdd-1', 'ux-1', 'sad-1'];
const plan = 'M01\nT01: check A; Done when A\nT02: check B; Done when B';
const fingerprint = (content: string): string => createHash('sha256').update(content).digest('hex');

type Call = { operation: string; target: string };

class FakeMcp {
  readonly calls: Call[] = [];
  readonly artifacts = new Map<string, string>();
  body = '';

  publish(target: string, content: string): void {
    this.calls.push({ operation: 'publish', target });
    this.artifacts.set(target, content);
  }

  read(target: string): string | undefined {
    this.calls.push({ operation: 'read', target });
    return this.artifacts.get(target);
  }

  updateStory(body: string): void {
    this.calls.push({ operation: 'update-story', target: `${repository}#${storyIssue}` });
    this.body = body;
  }
}

function publishPlanningRecord(mcp: FakeMcp, content: string): string {
  mcp.publish(planArtifact, content);
  assert.equal(mcp.read(planArtifact), content, 'exact plan must be read back');
  mcp.updateStory('- [ ] T01\n- [ ] T02');
  mcp.publish(progressArtifact, 'review 1: pending');
  assert.equal(mcp.read(progressArtifact), 'review 1: pending');
  return fingerprint(content);
}

function mayDispatch(mcp: FakeMcp, acceptedFingerprint: string): boolean {
  const currentPlan = mcp.read(planArtifact);
  return currentPlan !== undefined && fingerprint(currentPlan) === acceptedFingerprint;
}

function expectContracts(text: string, phrases: string[]): void {
  for (const phrase of phrases) assert.ok(text.includes(phrase), `missing contract: ${phrase}`);
}

describe('GFW-S02-T02 Story planning record', () => {
  it('publishes exact accepted plan, compact checklist, and concise progress to distinct Story artifacts', () => {
    const mcp = new FakeMcp();
    const accepted = publishPlanningRecord(mcp, plan);
    assert.equal(accepted, fingerprint(plan));
    assert.equal(mcp.body, '- [ ] T01\n- [ ] T02');
    assert.equal(mcp.artifacts.get(planArtifact), plan);
    assert.equal(mcp.artifacts.get(progressArtifact), 'review 1: pending');
    assert.deepEqual(mcp.calls.map(({ operation, target }) => `${operation}:${target}`), [
      `publish:${planArtifact}`, `read:${planArtifact}`, `update-story:${repository}#${storyIssue}`,
      `publish:${progressArtifact}`, `read:${progressArtifact}`,
    ]);
    expectContracts(planner, ['compact ordered Task ID/status checklist', 'read back identity and content', 'Do not create duplicate local plan or progress files']);
  });

  it('refuses unpublished or changed plan and leaves status/progress-only updates valid', () => {
    const mcp = new FakeMcp();
    const accepted = fingerprint(plan);
    assert.equal(mayDispatch(mcp, accepted), false);
    publishPlanningRecord(mcp, plan);
    assert.equal(mayDispatch(mcp, accepted), true);
    mcp.updateStory('- [x] T01\n- [ ] T02');
    mcp.publish(progressArtifact, 'review 1: clean; T01 pass');
    assert.equal(mayDispatch(mcp, accepted), true);
    mcp.publish(planArtifact, `${plan}\nT03: check C`);
    assert.equal(mayDispatch(mcp, accepted), false);
    expectContracts(executor, ['any plan-content change invalidates review', 'A status or progress change alone', 'fresh architecture reviewer']);
  });

  it('dispatches artifact-only independent review with stable fingerprint and authoritative source identities', () => {
    const mcp = new FakeMcp();
    const accepted = publishPlanningRecord(mcp, plan);
    const packet = {
      repository, storyIssue, planArtifact, planContent: mcp.read(planArtifact),
      fingerprint: accepted, sourceArtifacts,
    };
    assert.equal(packet.fingerprint, fingerprint(packet.planContent ?? ''));
    assert.deepEqual(packet.sourceArtifacts, sourceArtifacts);
    assert.equal(Object.hasOwn(packet, 'localPlanFolder'), false);
    assert.equal(Object.hasOwn(packet, 'localSourcePaths'), false);
    assert.equal(mcp.calls.some(({ operation }) => operation === 'local-write'), false);
    expectContracts(executor, ['independent', 'read-only', 'stable fingerprint', 'local plan folder']);
  });

  it('preserves Task and PR gates without activating later handoff', () => {
    expectContracts(executor, ['specific, objective, executable pass/fail check', 'expected passing evidence', 'one passing, scoped Task-ID-linked Conventional Commit', 'verified Story integration gate', 'unsupported later checkpoint']);
  });
});
