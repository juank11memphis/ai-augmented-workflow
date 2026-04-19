import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getNextSkillSelection } from './handler.js';
import type { EkkoState } from '../../shared/types.js';

const BASE_STATE: EkkoState = {
  ekkoVersion: '0.1.0',
  templateVersion: '39',
  generatedAt: '2026-04-19T00:00:00.000Z',
  updatedAt: '2026-04-19T00:00:00.000Z',
  selectedAgents: ['codex'],
  managedFiles: {},
};

describe('getNextSkillSelection', () => {
  it('blocks unknown skills with the catalog resolution message', () => {
    assert.deepEqual(getNextSkillSelection(BASE_STATE, 'nope'), {
      status: 'blocked',
      message: 'Unknown skill `nope`. Run `ekko skills list` to see available skills.',
    });
  });

  it('returns no-op success when a language skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedLanguageSkills: ['typescript'] }, 'typescript'), {
      status: 'noop',
      message: 'TypeScript is already selected.',
    });
  });

  it('returns no-op success when a framework skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedFrameworkSkills: ['react'] }, 'react'), {
      status: 'noop',
      message: 'React is already selected.',
    });
  });

  it('returns no-op success when an architecture skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'command-pattern' }, 'command-pattern'), {
      status: 'noop',
      message: 'Command Pattern is already selected.',
    });
  });

  it('prepares a next selection for a new language skill', () => {
    const result = getNextSkillSelection(BASE_STATE, 'typescript');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'TypeScript');
    assert.deepEqual(
      result.selection.selectedLanguageSkills.map((skill) => skill.id),
      ['typescript']
    );
    assert.deepEqual(result.selection.selectedFrameworkSkills, []);
    assert.equal(result.selection.selectedArchitectureSkill, undefined);
  });

  it('prepares a next selection for a new framework skill while preserving existing skills', () => {
    const result = getNextSkillSelection({ ...BASE_STATE, selectedLanguageSkills: ['typescript'], selectedFrameworkSkills: ['react'] }, 'nextjs');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.deepEqual(
      result.selection.selectedLanguageSkills.map((skill) => skill.id),
      ['typescript']
    );
    assert.deepEqual(
      result.selection.selectedFrameworkSkills.map((skill) => skill.id),
      ['react', 'nextjs']
    );
  });

  it('prepares a next selection for a new architecture skill when none is selected', () => {
    const result = getNextSkillSelection(BASE_STATE, 'command-pattern');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.selection.selectedArchitectureSkill?.id, 'command-pattern');
  });

  it('blocks replacing an existing architecture skill', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'ddd-hexagonal' }, 'command-pattern'), {
      status: 'blocked',
      message: 'Cannot select Command Pattern because another architecture skill is already selected.',
      hint: 'Architecture skill replacement is not supported yet. Keep the existing architecture skill or stop managing it first.',
    });
  });
});
