import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS, SUPPORTED_AGENTS } from './catalog.js';
import type { SupportedAgent } from './types.js';
import { getWorkflowTargets } from './workflow-targets.js';

const ROOT_PATH = '/test-project';

describe('getWorkflowTargets', () => {
  it('keeps Windsurf-only targets on AGENTS.md and shared skill files', () => {
    const targets = getWorkflowTargets(
      ROOT_PATH,
      [getSupportedAgent('windsurf')],
      [SELECTABLE_LANGUAGE_SKILLS[0]],
      [SELECTABLE_FRAMEWORK_SKILLS[0]],
      SELECTABLE_ARCHITECTURE_SKILLS[0]
    );

    assert.deepEqual(getRelativeTargetPaths(targets), [
      'AGENTS.md',
      '.agents/skills/clean-code/SKILL.md',
      '.agents/skills/product-vision-writer/SKILL.md',
      '.agents/skills/feature-brief-writer/SKILL.md',
      '.agents/skills/technical-design-writer/SKILL.md',
      '.agents/skills/scrum-master-planner/SKILL.md',
      '.agents/skills/ai-implementation-planner/SKILL.md',
      '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      '.agents/skills/typescript/SKILL.md',
      '.agents/skills/react/SKILL.md',
      '.agents/skills/ddd-hexagonal/SKILL.md',
    ]);
    assertNoInvalidTargets(targets);
    assert.equal(getRelativeTargetPaths(targets).some((relativePath) => relativePath.startsWith('.windsurf/')), false);
  });

  it('includes only existing agent support files when every agent is selected', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [SELECTABLE_LANGUAGE_SKILLS[0]]);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('AGENTS.md'), true);
    assert.equal(targetPaths.includes('.codex/config.toml'), true);
    assert.equal(targetPaths.includes('GEMINI.md'), true);
    assert.equal(targetPaths.includes('CLAUDE.md'), true);
    assert.equal(targetPaths.some((relativePath) => relativePath.startsWith('.windsurf/')), false);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/typescript/SKILL.md').length, 1);
    assertNoInvalidTargets(targets);
  });
});

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Missing supported agent: ${agentId}`);
  }

  return agent;
}

function getRelativeTargetPaths(targets: ReturnType<typeof getWorkflowTargets>): string[] {
  return targets.map((target) => path.relative(ROOT_PATH, target.targetPath));
}

function assertNoInvalidTargets(targets: ReturnType<typeof getWorkflowTargets>): void {
  for (const target of targets) {
    assert.notEqual(target.label, undefined);
    assert.notEqual(target.targetPath, undefined);
    assert.notEqual(target.templateRelativePath, undefined);
    assert.equal(target.targetPath.includes('undefined'), false);
  }
}
