import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SUPPORTED_AGENTS, resolveSelectableSkillById } from './catalog.js';
import type { ResolvedSelectableSkill, SupportedAgent } from './types.js';

describe('SUPPORTED_AGENTS', () => {
  it('includes Windsurf without an agent-specific support file', () => {
    assert.deepEqual(
      SUPPORTED_AGENTS.map((agent) => agent.id),
      ['codex', 'gemini', 'claude', 'windsurf']
    );

    const windsurf = getSupportedAgent('windsurf');
    assert.equal(windsurf.name, 'Windsurf');
    assert.match(windsurf.description, /AGENTS\.md/);
    assert.match(windsurf.description, /[.]agents[/]skills/);
    assert.equal(windsurf.targetRelativePath, undefined);
    assert.equal(windsurf.templateRelativePath, undefined);
  });

  it('keeps existing agents mapped to agent-specific support files', () => {
    const agentIds: SupportedAgent['id'][] = ['codex', 'gemini', 'claude'];

    for (const agentId of agentIds) {
      const agent = getSupportedAgent(agentId);
      assert.equal(typeof agent.targetRelativePath, 'string');
      assert.equal(typeof agent.templateRelativePath, 'string');
    }
  });
});

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

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Missing supported agent: ${agentId}`);
  }

  return agent;
}
