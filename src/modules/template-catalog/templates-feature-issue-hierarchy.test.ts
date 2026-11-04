import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const guidance = readTemplate('skills/scrum-master-planner/SKILL.md');

type Issue = { id: number; parentId: number | null; kind: 'Feature' | 'Epic' | 'Story'; body: string };
type PlannedIssue = { kind: 'Epic' | 'Story'; parentId: number; body: string };

class FakeMcp {
  readonly issues: Issue[];
  readonly createCalls: PlannedIssue[] = [];
  readonly nativeSubIssues: boolean;

  constructor(issues: Issue[], nativeSubIssues = true) {
    this.issues = [...issues];
    this.nativeSubIssues = nativeSubIssues;
  }

  find(kind: Issue['kind'], parentId: number): Issue | undefined {
    return this.issues.find((issue) => issue.kind === kind && issue.parentId === parentId);
  }

  create(planned: PlannedIssue): Issue {
    if (!this.nativeSubIssues) throw new Error('native sub-issue operation unavailable');
    this.createCalls.push(planned);
    const issue: Issue = { id: this.issues.length + 1, ...planned };
    this.issues.push(issue);
    return issue;
  }
}

// This deterministic model checks the stated MCP operation contract, not live agent compliance.
function publishHierarchy(mcp: FakeMcp, featureId: number): { epic: Issue; story: Issue; link: string } {
  if (!mcp.nativeSubIssues) throw new Error('native sub-issue operation unavailable');
  const feature = mcp.issues.find((issue) => issue.id === featureId && issue.kind === 'Feature');
  if (!feature) throw new Error('Feature issue not found');

  const epic = mcp.find('Epic', feature.id) ?? mcp.create({
    kind: 'Epic', parentId: feature.id, body: 'Epic definition\n## Acceptance Criteria\nEpic outcome',
  });
  const story = mcp.find('Story', epic.id) ?? mcp.create({
    kind: 'Story', parentId: epic.id, body: 'Story definition\n## Acceptance Criteria\nStory outcome',
  });
  return { epic, story, link: `https://github.example/issues/${story.id}` };
}

describe('Scrum planner native GitHub issue hierarchy contract', () => {
  it('states the prompt-owned MCP hierarchy and no local Epic/Story output', () => {
    assert.match(guidance, /Epic issues as native sub-issues of the existing Feature issue/);
    assert.match(guidance, /Story issues as native sub-issues of exactly one Epic issue/);
    assert.match(guidance, /find an existing matching Epic under that Feature before creating one/);
    assert.match(guidance, /find a matching Story under its intended Epic before creating one/);
    assert.match(guidance, /Confirm each created or reused parent relationship by readback/);
    assert.match(guidance, /Do not create local Epic\/Story Markdown files or directories as a fallback/);
    assert.doesNotMatch(guidance, /write Epics and User Stories under:/);
  });

  it('models native Feature→Epic→Story parent IDs, owning definitions, and a confirmed link', () => {
    const mcp = new FakeMcp([{ id: 1, kind: 'Feature', parentId: null, body: 'Feature definition' }]);
    const result = publishHierarchy(mcp, 1);
    assert.equal(result.epic.parentId, 1);
    assert.equal(result.story.parentId, result.epic.id);
    assert.match(result.epic.body, /Epic definition\n## Acceptance Criteria\nEpic outcome/);
    assert.match(result.story.body, /Story definition\n## Acceptance Criteria\nStory outcome/);
    assert.equal(result.link, `https://github.example/issues/${result.story.id}`);
    assert.deepEqual(mcp.createCalls.map(({ kind, parentId }) => ({ kind, parentId })), [
      { kind: 'Epic', parentId: 1 }, { kind: 'Story', parentId: result.epic.id },
    ]);
    assert.match(guidance, /relevant confirmed Feature, Epic, or Story issue links/);
  });

  it('reuses matching native children without duplicate create calls', () => {
    const mcp = new FakeMcp([{ id: 1, kind: 'Feature', parentId: null, body: 'Feature definition' }]);
    const first = publishHierarchy(mcp, 1);
    mcp.createCalls.length = 0;
    const second = publishHierarchy(mcp, 1);
    assert.equal(second.epic.id, first.epic.id);
    assert.equal(second.story.id, first.story.id);
    assert.equal(mcp.createCalls.length, 0);
    assert.equal(mcp.issues.length, 3);
  });

  it('stops before any create when native sub-issue capability is missing', () => {
    const mcp = new FakeMcp([{ id: 1, kind: 'Feature', parentId: null, body: 'Feature definition' }], false);
    assert.throws(() => publishHierarchy(mcp, 1), /native sub-issue operation unavailable/);
    assert.equal(mcp.createCalls.length, 0);
    assert.match(guidance, /native sub-issue operation is unavailable.*stop; do not substitute flat links or local files/);
    assert.match(guidance, /If a write response is uncertain, read back the intended parent and child before any retry/);
    assert.match(guidance, /Do not present an unconfirmed write as complete/);
  });
});
