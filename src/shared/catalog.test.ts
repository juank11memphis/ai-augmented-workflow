import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSelectableSkillById } from './catalog.js';
import type { ResolvedSelectableSkill } from './types.js';

describe('resolveSelectableSkillById', () => {
  it('resolves selectable language, framework, and architecture skills with their category', () => {
    assertResolvedSkill('typescript', 'language');
    assertResolvedSkill('react', 'framework');
    assertResolvedSkill('nextjs', 'framework');
    assertResolvedSkill('ddd-hexagonal', 'architecture');
    assertResolvedSkill('command-pattern', 'architecture');
  });

  it('fails with a skills list suggestion for unknown skill ids', () => {
    assertUnknownSkill('nope');
  });

  it('does not resolve required-only skills as selectable skills', () => {
    assertUnknownSkill('clean-code');
  });
});

function assertResolvedSkill(skillId: string, expectedKind: ResolvedSelectableSkill['kind']): void {
  const result = resolveSelectableSkillById(skillId);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.resolved.kind, expectedKind);
  assert.equal(result.resolved.skill.id, skillId);
}

function assertUnknownSkill(skillId: string): void {
  assert.deepEqual(resolveSelectableSkillById(skillId), {
    ok: false,
    message: `Unknown skill \`${skillId}\`. Run \`ekko skills list\` to see available skills.`,
  });
}
