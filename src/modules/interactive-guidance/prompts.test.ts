import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SibuState } from '../../shared/types.js';
import { MCP_SERVER_SELECTION_MESSAGE, askForNotionDocsParentPage, getPromptableWorkflowSkills, shouldAskForNewLanguageSkills } from './index.js';

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
