import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SibuState } from '../../../shared/types.js';
import { getNextSkillSelection } from './handler.js';

const BASE_STATE: SibuState = {
  sibuVersion: '0.1.0',
  templateVersion: '40',
  generatedAt: '2026-04-19T00:00:00.000Z',
  updatedAt: '2026-04-19T00:00:00.000Z',
  selectedAgents: ['codex'],
  managedFiles: {},
};

describe('getNextSkillSelection', () => {
  it('blocks unknown skills with the catalog resolution message', () => {
    assert.deepEqual(getNextSkillSelection(BASE_STATE, 'nope'), {
      status: 'blocked',
      message: 'Unknown skill `nope`. Run `sibu skills list` to see available skills.',
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

  it('returns no-op success when Layered Architecture is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'layered-architecture' }, 'layered-architecture'), {
      status: 'noop',
      message: 'Layered Architecture is already selected.',
    });
  });

  it('returns no-op success when a workflow skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedWorkflowSkills: ['ai-prompt-engineer-master'] }, 'ai-prompt-engineer-master'), {
      status: 'noop',
      message: 'AI Prompt Engineer Master is already selected.',
    });
  });

  it('returns no-op success when a database skill is already selected', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedDatabaseSkills: ['postgresql-expert'] }, 'postgresql-expert'), {
      status: 'noop',
      message: 'PostgreSQL Expert is already selected.',
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

  it('prepares a next selection for Go language support', () => {
    const result = getNextSkillSelection(BASE_STATE, 'golang');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'Go');
    assert.deepEqual(
      result.selection.selectedLanguageSkills.map((skill) => skill.id),
      ['golang']
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

  it('prepares a next selection for Layered Architecture when no architecture skill is selected', () => {
    const result = getNextSkillSelection(BASE_STATE, 'layered-architecture');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'Layered Architecture');
    assert.equal(result.selection.selectedArchitectureSkill?.id, 'layered-architecture');
  });

  it('prepares a next selection for a new workflow skill', () => {
    const result = getNextSkillSelection(BASE_STATE, 'ai-prompt-engineer-master');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'AI Prompt Engineer Master');
    assert.deepEqual(
      result.selection.selectedWorkflowSkills.map((skill) => skill.id),
      ['ai-prompt-engineer-master']
    );
  });

  it('prepares a next selection for UX Expert while preserving existing workflow skills', () => {
    const result = getNextSkillSelection({ ...BASE_STATE, selectedWorkflowSkills: ['ai-prompt-engineer-master'] }, 'ux-expert');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.deepEqual(
      result.selection.selectedWorkflowSkills.map((skill) => skill.id),
      ['ai-prompt-engineer-master', 'ux-expert']
    );
  });

  it('prepares a next selection for PostgreSQL Expert', () => {
    const result = getNextSkillSelection(BASE_STATE, 'postgresql-expert');

    assert.equal(result.status, 'selected');
    if (result.status !== 'selected') {
      return;
    }

    assert.equal(result.skillName, 'PostgreSQL Expert');
    assert.deepEqual(
      result.selection.selectedDatabaseSkills.map((skill) => skill.id),
      ['postgresql-expert']
    );
  });

  it('blocks replacing an existing architecture skill', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'ddd-hexagonal' }, 'command-pattern'), {
      status: 'blocked',
      message: 'Cannot select Command Pattern because another architecture skill is already selected.',
      hint: 'Every healthy Sibu workflow requires one selected architecture skill. Architecture skill replacement is not supported yet; keep the existing architecture skill.',
    });
  });

  it('blocks replacing command pattern with DDD and Hexagonal Architecture', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'command-pattern' }, 'ddd-hexagonal'), {
      status: 'blocked',
      message: 'Cannot select DDD + Hexagonal Architecture because another architecture skill is already selected.',
      hint: 'Every healthy Sibu workflow requires one selected architecture skill. Architecture skill replacement is not supported yet; keep the existing architecture skill.',
    });
  });

  it('blocks replacing an existing architecture skill with Layered Architecture', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'command-pattern' }, 'layered-architecture'), {
      status: 'blocked',
      message: 'Cannot select Layered Architecture because another architecture skill is already selected.',
      hint: 'Every healthy Sibu workflow requires one selected architecture skill. Architecture skill replacement is not supported yet; keep the existing architecture skill.',
    });
  });

  it('blocks replacing Layered Architecture with another architecture skill', () => {
    assert.deepEqual(getNextSkillSelection({ ...BASE_STATE, selectedArchitectureSkill: 'layered-architecture' }, 'command-pattern'), {
      status: 'blocked',
      message: 'Cannot select Command Pattern because another architecture skill is already selected.',
      hint: 'Every healthy Sibu workflow requires one selected architecture skill. Architecture skill replacement is not supported yet; keep the existing architecture skill.',
    });
  });
});
