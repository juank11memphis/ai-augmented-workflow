import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SELECTABLE_ARCHITECTURE_SKILLS } from '../../modules/template-catalog/index.js';
import type { SibuState } from '../../shared/types.js';
import {
  MCP_SERVER_SELECTION_MESSAGE,
  askForNewArchitectureSkill,
  askForNotionDocsParentPage,
  getInitArchitectureSkillOptions,
  getPromptableWorkflowSkills,
  getSyncArchitectureSkillOptions,
  shouldAskForNewLanguageSkills,
} from './index.js';

const BASE_STATE: SibuState = {
  sibuVersion: '0.1.0',
  templateVersion: '40',
  generatedAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
  selectedAgents: ['codex'],
  managedFiles: {},
};

describe('shouldAskForNewLanguageSkills', () => {
  it('returns false when at least one language is already selected', () => {
    assert.equal(shouldAskForNewLanguageSkills({ ...BASE_STATE, selectedLanguageSkills: ['golang'] }), false);
  });

  it('returns true when no language has been selected yet', () => {
    assert.equal(shouldAskForNewLanguageSkills(BASE_STATE), true);
    assert.equal(shouldAskForNewLanguageSkills({ ...BASE_STATE, selectedLanguageSkills: [] }), true);
  });
});

describe('MCP server selection copy', () => {
  it('explains Sibu configures files only and users own prerequisites and auth', () => {
    assert.match(MCP_SERVER_SELECTION_MESSAGE, /config/i);
    assert.match(MCP_SERVER_SELECTION_MESSAGE, /only/i);
    assert.match(MCP_SERVER_SELECTION_MESSAGE, /prerequisites/i);
    assert.match(MCP_SERVER_SELECTION_MESSAGE, /authentication/i);
  });
});

describe('getInitArchitectureSkillOptions', () => {
  it('offers only selectable architecture skills and no none option', () => {
    const options = getInitArchitectureSkillOptions();

    assert.deepEqual(
      options.map((option) => option.value),
      SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => skill.id)
    );
    assert.equal(options.some((option) => String(option.value) === 'none'), false);
  });
});

describe('getSyncArchitectureSkillOptions', () => {
  it('offers only selectable architecture skills and no none option for missing-architecture repair', () => {
    const options = getSyncArchitectureSkillOptions();

    assert.deepEqual(
      options.map((option) => option.value),
      SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => skill.id)
    );
    assert.equal(options.some((option) => String(option.value) === 'none'), false);
  });
});

describe('askForNewArchitectureSkill', () => {
  it('does not prompt or change state when architecture is already selected', async () => {
    const result = await askForNewArchitectureSkill({ ...BASE_STATE, selectedArchitectureSkill: SELECTABLE_ARCHITECTURE_SKILLS[0].id });

    assert.equal(result.changedState, false);
    assert.equal(result.state.selectedArchitectureSkill, SELECTABLE_ARCHITECTURE_SKILLS[0].id);
  });
});

describe('getPromptableWorkflowSkills', () => {
  it('excludes workflow skills that are already implied by MCP selections', () => {
    const skills = getPromptableWorkflowSkills(['export-to-github', 'export-to-notion']);

    assert.equal(skills.some((skill) => skill.id === 'export-to-github'), false);
    assert.equal(skills.some((skill) => skill.id === 'export-to-notion'), false);
    assert.equal(skills.some((skill) => skill.id === 'ai-prompt-engineer-master'), true);
    assert.equal(skills.some((skill) => skill.id === 'ux-expert'), true);
  });
});

describe('askForNotionDocsParentPage', () => {
  it('is exported for Notion MCP selection flows', () => {
    assert.equal(typeof askForNotionDocsParentPage, 'function');
  });
});
