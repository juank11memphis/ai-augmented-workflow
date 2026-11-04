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

});
