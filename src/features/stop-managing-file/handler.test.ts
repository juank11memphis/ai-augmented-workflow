import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SELECTABLE_FRAMEWORK_SKILLS, SUPPORTED_AGENTS } from '../../modules/workflow-target-planning/index.js';
import type { SelectableArchitectureSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SupportedAgent } from '../../shared/types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from '../../shared/workflow-targets.js';
import { stopSelectedSkill } from './handler.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('stopSelectedSkill', () => {
  it('stops a selected framework skill by selectable skill id', () => {
    const rootPath = createInitializedRepoWithNextjs();

    const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'));
    const result = stopSelectedSkill({ rootPath, state, skillName: 'nextjs' });

    assert.equal(result.status, 'stopped');
    if (result.status !== 'stopped') {
      return;
    }

    assert.deepEqual(result.state.selectedFrameworkSkills, []);
    assert.equal(result.state.managedFiles['.agents/skills/nextjs/SKILL.md']?.status, 'unmanaged');
    assert.equal(fs.existsSync(path.join(rootPath, '.agents/skills/nextjs/SKILL.md')), true);
    assert.doesNotMatch(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /nextjs/);
  });

  it('rejects raw managed file paths', () => {
    const rootPath = createInitializedRepoWithNextjs();
    const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'));

    const result = stopSelectedSkill({ rootPath, state, skillName: '.agents/skills/nextjs/SKILL.md' });

    assert.equal(result.status, 'blocked');
    if (result.status !== 'blocked') {
      return;
    }

    assert.equal(result.message, 'Unknown skill `.agents/skills/nextjs/SKILL.md`. Run `sibu skills list` to see available skills.');
  });

  it('does not change files when the skill is not selected', () => {
    const rootPath = createInitializedRepoWithNextjs();
    const state = JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8'));
    const beforeAgents = fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8');

    const result = stopSelectedSkill({ rootPath, state, skillName: 'react' });

    assert.deepEqual(result, { status: 'noop', message: 'React is not selected.' });
    assert.equal(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), beforeAgents);
  });
});

function createInitializedRepoWithNextjs(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-stop-skill-test-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const selectedLanguageSkills: SelectableLanguageSkill[] = [];
  const selectedFrameworkSkills: SelectableFrameworkSkill[] = [getFrameworkSkill('nextjs')];
  const selectedArchitectureSkill: SelectableArchitectureSkill | undefined = undefined;
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({ rootPath, statePath: path.join(rootPath, '.sibu/state.json'), selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, targets });

  return rootPath;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}

function getFrameworkSkill(skillId: SelectableFrameworkSkill['id']): SelectableFrameworkSkill {
  const skill = SELECTABLE_FRAMEWORK_SKILLS.find((frameworkSkill) => frameworkSkill.id === skillId);

  if (!skill) {
    throw new Error(`Unsupported framework skill: ${skillId}`);
  }

  return skill;
}
