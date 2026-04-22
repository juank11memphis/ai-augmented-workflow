import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EchoState } from './types.js';
import { shouldAskForNewLanguageSkills } from './prompts.js';

const BASE_STATE: EchoState = {
  echoVersion: '0.1.0',
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
