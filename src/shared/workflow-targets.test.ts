import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS, SELECTABLE_WORKFLOW_SKILLS, SUPPORTED_AGENTS } from './catalog.js';
import type { SibuState, SupportedAgent } from './types.js';
import { readTemplateManifest } from './templates.js';
import { getSelectedAgentsFromState, getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from './workflow-targets.js';

const ROOT_PATH = '/test-project';

describe('getWorkflowTargets', () => {
  it('keeps Windsurf-only targets on AGENTS.md and shared skill files', () => {
    const targets = getWorkflowTargets(
      ROOT_PATH,
      [getSupportedAgent('windsurf')],
      [SELECTABLE_LANGUAGE_SKILLS[0]],
      [SELECTABLE_FRAMEWORK_SKILLS[0]],
      SELECTABLE_ARCHITECTURE_SKILLS[0],
      [SELECTABLE_WORKFLOW_SKILLS[0]]
    );

    assert.deepEqual(getRelativeTargetPaths(targets), [
      'AGENTS.md',
      '.agents/skills/clean-code/SKILL.md',
      '.agents/skills/product-vision-writer/SKILL.md',
      '.agents/skills/deep-module-map-writer/SKILL.md',
      '.agents/skills/feature-brief-writer/SKILL.md',
      '.agents/skills/technical-design-writer/SKILL.md',
      '.agents/skills/scrum-master-planner/SKILL.md',
      '.agents/skills/ai-implementation-planner/SKILL.md',
      '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      '.agents/skills/typescript/SKILL.md',
      '.agents/skills/react/SKILL.md',
      '.agents/skills/ddd-hexagonal/SKILL.md',
      '.agents/skills/ai-prompt-engineer-master/SKILL.md',
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
    assert.equal(targetPaths.includes('.agents/skills/deep-module-map-writer/SKILL.md'), true);
    assert.equal(targetPaths.includes('docs/deep-module-map.md'), false);
    assertNoInvalidTargets(targets);
  });

  it('persists workflow skills selected during initialization', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-workflow-targets-'));
    const selectedAgents = [getSupportedAgent('codex')];
    const selectedLanguageSkills = [SELECTABLE_LANGUAGE_SKILLS[0]];
    const selectedFrameworkSkills = [SELECTABLE_FRAMEWORK_SKILLS[0]];
    const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS[0];
    const selectedWorkflowSkills = SELECTABLE_WORKFLOW_SKILLS;
    const targets = getWorkflowTargets(
      rootPath,
      selectedAgents,
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills
    );

    const files = renderMissingWorkflowFiles({
      missingTargets: targets,
      overview: 'Test project.',
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
    });

    for (const file of files) {
      fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
      fs.writeFileSync(file.targetPath, file.contents, 'utf8');
    }

    const statePath = path.join(rootPath, '.sibu/state.json');
    writeSibuState({
      rootPath,
      statePath,
      selectedAgents,
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
      targets,
    });

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;

    assert.deepEqual(state.selectedWorkflowSkills, ['ai-prompt-engineer-master', 'ux-expert']);
    assert.deepEqual(state.managedFiles['.agents/skills/deep-module-map-writer/SKILL.md'], {
      template: 'skills/deep-module-map-writer/SKILL.md',
      templateVersion: readTemplateManifest().templates['skills/deep-module-map-writer/SKILL.md']?.version,
      sha256: state.managedFiles['.agents/skills/deep-module-map-writer/SKILL.md']?.sha256,
      status: 'managed',
    });
    assert.ok(state.managedFiles['.agents/skills/ai-prompt-engineer-master/SKILL.md']);
    assert.ok(state.managedFiles['.agents/skills/ux-expert/SKILL.md']);
    assert.equal(state.managedFiles['docs/deep-module-map.md'], undefined);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ai-prompt-engineer-master`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ux-expert`/);

    fs.rmSync(rootPath, { recursive: true, force: true });
  });
});

describe('getSelectedAgentsFromState', () => {
  it('resolves Windsurf from selected agent state', () => {
    const state: SibuState = {
      sibuVersion: '0.1.0',
      templateVersion: '40',
      generatedAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      selectedAgents: ['windsurf'],
      managedFiles: {},
    };

    assert.deepEqual(getSelectedAgentsFromState(state).map((agent) => agent.id), ['windsurf']);
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
