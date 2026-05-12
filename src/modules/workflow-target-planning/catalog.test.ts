import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MANDATORY_SKILLS,
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
  resolveSelectableMcpServerById,
  resolveSelectableSkillById,
} from './catalog.js';
import type { ResolvedSelectableSkill, SkillTemplate, SupportedAgent } from '../../shared/types.js';

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
    assertResolvedSkill('golang', 'language');
    assertResolvedSkill('react', 'framework');
    assertResolvedSkill('nextjs', 'framework');
    assertResolvedSkill('ddd-hexagonal', 'architecture');
    assertResolvedSkill('command-pattern', 'architecture');
    assertResolvedSkill('postgresql-expert', 'database');
    assertResolvedSkill('ai-prompt-engineer-master', 'workflow');
    assertResolvedSkill('ux-expert', 'workflow');
  });

  it('fails with a skills list suggestion for unknown skill ids', () => {
    assertUnknownSkill('nope');
  });

  it('does not resolve required-only skills as selectable skills', () => {
    assertUnknownSkill('clean-code');
  });
});

describe('resolveSelectableMcpServerById', () => {
  it('resolves the GitHub MCP server', () => {
    const result = resolveSelectableMcpServerById('github');

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.resolved.server.id, 'github');
    assert.equal(result.resolved.server.name, 'GitHub MCP Server');
    assert.equal(result.resolved.server.source, 'github/github-mcp-server');
  });

  it('resolves the Notion MCP server', () => {
    const result = resolveSelectableMcpServerById('notion');

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.resolved.server.id, 'notion');
    assert.equal(result.resolved.server.name, 'Notion MCP Server');
    assert.equal(result.resolved.server.source, 'developers.notion.com/guides/mcp');
  });

  it('describes selectable MCP servers as config-only and user-owned for prerequisites and auth', () => {
    for (const server of SELECTABLE_MCP_SERVERS) {
      assert.match(server.description, /config/i);
      assert.match(server.description, /user-owned/i);
      assert.match(server.description, /auth|authentication|OAuth/i);
      assert.doesNotMatch(server.description, /create(s|d)? token/i);
      assert.doesNotMatch(server.description, /validates? auth/i);
      assert.doesNotMatch(server.description, /live connectivity/i);
    }
  });

  it('fails with an MCP list suggestion for unknown MCP server ids', () => {
    assert.deepEqual(resolveSelectableMcpServerById('nope'), {
      ok: false,
      message: 'Unknown MCP server `nope`. Run `sibu mcp list` to see available MCP servers.',
    });
  });
});

describe('skill target paths', () => {
  it('targets Windsurf through shared .agents skills for mandatory and selectable skills', () => {
    const skillTemplates = [
      ...MANDATORY_SKILLS,
      ...SELECTABLE_LANGUAGE_SKILLS,
      ...SELECTABLE_FRAMEWORK_SKILLS,
      ...SELECTABLE_ARCHITECTURE_SKILLS,
      ...SELECTABLE_WORKFLOW_SKILLS,
      ...SELECTABLE_DATABASE_SKILLS,
    ];

    for (const skillTemplate of skillTemplates) {
      assertWindsurfUsesSharedSkillPath(skillTemplate);
    }
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
    message: `Unknown skill \`${skillId}\`. Run \`sibu skills list\` to see available skills.`,
  });
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Missing supported agent: ${agentId}`);
  }

  return agent;
}

function assertWindsurfUsesSharedSkillPath(skillTemplate: SkillTemplate): void {
  const windsurfPath = skillTemplate.targetRelativePathsByAgent.windsurf;

  assert.equal(typeof windsurfPath, 'string');
  assert.ok(windsurfPath?.startsWith('.agents/skills/'));
  assert.ok(windsurfPath?.endsWith('/SKILL.md'));
  assert.equal(windsurfPath?.startsWith('.windsurf/skills/'), false);
  assert.equal(windsurfPath, skillTemplate.targetRelativePathsByAgent.codex);
  assert.equal(windsurfPath, skillTemplate.targetRelativePathsByAgent.gemini);
  assert.equal(windsurfPath, skillTemplate.targetRelativePathsByAgent.claude);
}
