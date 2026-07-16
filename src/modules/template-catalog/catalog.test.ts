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
  getMcpServersRequiredByWorkflowSkills,
  getWorkflowSkillsImpliedByMcpServers,
  resolveSelectableMcpServerById,
  resolveSelectableSkillById,
} from './catalog.js';
import type { ResolvedSelectableSkill, SkillTemplate, SupportedAgent } from '../../shared/types.js';

describe('SUPPORTED_AGENTS', () => {
  it('includes only currently supported agents', () => {
    assert.deepEqual(
      SUPPORTED_AGENTS.map((agent) => agent.id),
      ['codex', 'gemini', 'claude']
    );
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
    assertResolvedSkill('layered-architecture', 'architecture');
    assertResolvedSkill('postgresql-expert', 'database');
    assertResolvedSkill('ai-prompt-engineer-master', 'workflow');
    assertResolvedSkill('ux-expert', 'workflow');
    assertResolvedSkill('export-to-github', 'workflow');
    assertResolvedSkill('export-to-notion', 'workflow');
  });

  it('fails with a skills list suggestion for unknown skill ids', () => {
    assertUnknownSkill('nope');
  });

  it('does not resolve required-only skills as selectable skills', () => {
    assertUnknownSkill('clean-code');
    assertUnknownSkill('structured-logging');
    assertUnknownSkill('business-domain-model-writer');
    assertUnknownSkill('feature-idea-capture');
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

describe('export workflow skill MCP pairings', () => {
  it('identifies MCP servers required by exporter workflow skills', () => {
    assert.deepEqual(
      getMcpServersRequiredByWorkflowSkills(['export-to-github', 'export-to-notion']).map((server) => server.id),
      ['github', 'notion']
    );

    assert.deepEqual(getMcpServersRequiredByWorkflowSkills(['ai-prompt-engineer-master', 'ux-expert']), []);
  });

  it('identifies exporter workflow skills implied by selected MCP servers', () => {
    assert.deepEqual(
      getWorkflowSkillsImpliedByMcpServers(['github', 'notion']).map((skill) => skill.id),
      ['export-to-github', 'export-to-notion']
    );

    assert.deepEqual(
      getWorkflowSkillsImpliedByMcpServers(['notion']).map((skill) => skill.id),
      ['export-to-notion']
    );
  });
});

describe('skill target paths', () => {
  it('registers structured logging as one required workflow skill for all supported agents', () => {
    const structuredLoggingSkills = MANDATORY_SKILLS.filter(
      (skill) => skill.templateRelativePath === 'skills/structured-logging/SKILL.md'
    );

    assert.equal(structuredLoggingSkills.length, 1);
    assert.deepEqual(structuredLoggingSkills[0]?.targetRelativePathsByAgent, {
      codex: '.agents/skills/structured-logging/SKILL.md',
      gemini: '.agents/skills/structured-logging/SKILL.md',
      claude: '.agents/skills/structured-logging/SKILL.md',
    });
    assert.equal(structuredLoggingSkills[0]?.supplementalTargetsByAgent, undefined);
    assert.equal(
      SELECTABLE_WORKFLOW_SKILLS.some((skill) => skill.templateRelativePath === 'skills/structured-logging/SKILL.md'),
      false
    );
  });

  it('registers the Business Domain Model writer as one required workflow skill for all supported agents', () => {
    const businessDomainModelWriters = MANDATORY_SKILLS.filter(
      (skill) => skill.templateRelativePath === 'skills/business-domain-model-writer/SKILL.md'
    );

    assert.equal(businessDomainModelWriters.length, 1);
    assert.deepEqual(businessDomainModelWriters[0]?.targetRelativePathsByAgent, {
      codex: '.agents/skills/business-domain-model-writer/SKILL.md',
      gemini: '.agents/skills/business-domain-model-writer/SKILL.md',
      claude: '.agents/skills/business-domain-model-writer/SKILL.md',
    });
    assert.equal(businessDomainModelWriters[0]?.supplementalTargetsByAgent, undefined);
    assert.equal(
      SELECTABLE_WORKFLOW_SKILLS.some((skill) => skill.templateRelativePath === 'skills/business-domain-model-writer/SKILL.md'),
      false
    );
  });

  it('registers the Capabilities Map writer as one required workflow skill for all supported agents', () => {
    const capabilitiesMapWriters = MANDATORY_SKILLS.filter(
      (skill) => skill.templateRelativePath === 'skills/capabilities-map-writer/SKILL.md'
    );

    assert.equal(capabilitiesMapWriters.length, 1);
    assert.deepEqual(capabilitiesMapWriters[0]?.targetRelativePathsByAgent, {
      codex: '.agents/skills/capabilities-map-writer/SKILL.md',
      gemini: '.agents/skills/capabilities-map-writer/SKILL.md',
      claude: '.agents/skills/capabilities-map-writer/SKILL.md',
    });
    assert.equal(capabilitiesMapWriters[0]?.supplementalTargetsByAgent, undefined);
    assert.equal(
      SELECTABLE_WORKFLOW_SKILLS.some((skill) => skill.templateRelativePath === 'skills/capabilities-map-writer/SKILL.md'),
      false
    );
  });

  it('does not include unsupported agent keys in skill target maps', () => {
    const skillTemplates = [
      ...MANDATORY_SKILLS,
      ...SELECTABLE_LANGUAGE_SKILLS,
      ...SELECTABLE_FRAMEWORK_SKILLS,
      ...SELECTABLE_ARCHITECTURE_SKILLS,
      ...SELECTABLE_WORKFLOW_SKILLS,
      ...SELECTABLE_DATABASE_SKILLS,
    ];

    for (const skillTemplate of skillTemplates) {
      assertSupportedAgentKeysOnly(skillTemplate);
    }
  });
});

describe('architecture skill descriptions', () => {
  it('preserves the fixed architecture catalog', () => {
    assert.deepEqual(
      SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => skill.id),
      ['ddd-hexagonal', 'command-pattern', 'layered-architecture'],
    );
  });

  it('helps users compare architecture choices', () => {
    const dddHexagonal = getArchitectureSkill('ddd-hexagonal');
    assert.match(dddHexagonal.description, /complex/i);
    assert.match(dddHexagonal.description, /DDD/i);
    assert.match(dddHexagonal.description, /ports\/adapters/i);
    assert.match(dddHexagonal.description, /inward dependencies/i);

    const commandPattern = getArchitectureSkill('command-pattern');
    assert.match(commandPattern.description, /workflow-heavy/i);
    assert.match(commandPattern.description, /commands/i);
    assert.match(commandPattern.description, /handlers/i);

    const layeredArchitecture = getArchitectureSkill('layered-architecture');
    assert.match(layeredArchitecture.description, /smaller apps/i);
    assert.match(layeredArchitecture.description, /lightweight separation/i);
    assert.match(layeredArchitecture.description, /controllers/i);
    assert.match(layeredArchitecture.description, /services/i);
    assert.match(layeredArchitecture.description, /models/i);
    assert.match(layeredArchitecture.description, /repositories/i);
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

function getArchitectureSkill(skillId: string) {
  const skill = SELECTABLE_ARCHITECTURE_SKILLS.find((architectureSkill) => architectureSkill.id === skillId);

  if (!skill) {
    throw new Error(`Missing architecture skill: ${skillId}`);
  }

  return skill;
}

function assertSupportedAgentKeysOnly(skillTemplate: SkillTemplate): void {
  assert.deepEqual(Object.keys(skillTemplate.targetRelativePathsByAgent).sort(), ['claude', 'codex', 'gemini']);
}
