import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
} from '../modules/template-catalog/catalog.js';
import type { SibuState, SupportedAgent } from './types.js';
import type { SelectableWorkflowSkill } from './types.js';
import {
  getSelectedAgentsFromState,
  getSelectedMcpServersFromState,
  getSelectedSkillTargetsForAgents,
  getWorkflowTargets,
} from './expected-workflow-targets.js';
import { getMcpConfigTargetsForAgents } from '../modules/agent-tool-configuration/index.js';
import { renderMissingWorkflowFiles } from '../modules/template-catalog/index.js';

const ROOT_PATH = '/test-project';

describe('getWorkflowTargets', () => {
  it('does not generate targets for unsupported legacy selected agent ids', () => {
    const state: SibuState = {
      sibuVersion: '0.1.0',
      templateVersion: '40',
      generatedAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      selectedAgents: ['legacy-agent'],
      selectedLanguageSkills: ['typescript'],
      managedFiles: {},
    };

    const selectedAgents = getSelectedAgentsFromState(state);
    const targets = getWorkflowTargets(ROOT_PATH, selectedAgents, [SELECTABLE_LANGUAGE_SKILLS[0]]);

    assert.deepEqual(selectedAgents, []);
    assert.deepEqual(getRelativeTargetPaths(targets), ['AGENTS.md']);
    assertNoInvalidTargets(targets);
  });

  it('includes only existing agent support files when every agent is selected', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [SELECTABLE_LANGUAGE_SKILLS[0]]);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('AGENTS.md'), true);
    assert.equal(targetPaths.includes('.codex/config.toml'), true);
    assert.equal(targetPaths.includes('.codex/hooks.json'), true);
    assert.equal(targetPaths.includes('GEMINI.md'), true);
    assert.equal(targetPaths.includes('.gemini/settings.json'), true);
    assert.equal(targetPaths.includes('CLAUDE.md'), true);
    assert.equal(targetPaths.includes('.claude/settings.json'), true);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/business-domain-model-writer/SKILL.md').length, 1);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/capabilities-map-writer/SKILL.md').length, 1);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/typescript/SKILL.md').length, 1);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/ai-implementation-planner-toolbox/SKILL.md').length, 1);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/ai-implementation-executor-toolbox/SKILL.md').length, 1);
    assert.equal(targetPaths.includes('.agents/skills/deep-module-map-writer/SKILL.md'), true);
    assert.equal(targetPaths.includes('.agents/skills/feature-idea-capture/SKILL.md'), true);
    assert.equal(targetPaths.includes('docs/business-domain-model.md'), false);
    assert.equal(targetPaths.includes('docs/capabilities-map.md'), false);
    assert.equal(targetPaths.includes('docs/deep-module-map.md'), false);
    assert.equal(targetPaths.includes('docs/feature-ideas.md'), false);
    assertNoInvalidTargets(targets);
  });

  it('adds mandatory session-start hook targets only for agents with confirmed native support', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('.codex/hooks.json'), true);
    assert.equal(targetPaths.includes('.gemini/settings.json'), true);
    assert.equal(targetPaths.includes('.claude/settings.json'), true);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.gemini/settings.json').length, 1);
    assertNoInvalidTargets(targets);
  });

  it('exposes foreground worker capability metadata per supported agent', () => {
    assert.equal(getSupportedAgent('codex').supportsForegroundWorkers, true);
    assert.equal(getSupportedAgent('claude').supportsForegroundWorkers, true);
    assert.equal(getSupportedAgent('gemini').supportsForegroundWorkers, true);
  });

  it('installs Sibu implementation worker targets only for foreground-worker-capable hosts', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('.agents/skills/ai-implementation-planner-toolbox/SKILL.md'), true);
    assert.equal(targetPaths.includes('.agents/skills/ai-implementation-executor-toolbox/SKILL.md'), true);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/ai-implementation-planner-toolbox/SKILL.md').length, 1);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/ai-implementation-executor-toolbox/SKILL.md').length, 1);
    assert.equal(targetPaths.includes('.codex/agents/sibu-implementation-planner.toml'), true);
    assert.equal(targetPaths.includes('.codex/agents/sibu-implementation-executor.toml'), true);
    assert.equal(targetPaths.includes('.claude/agents/sibu-implementation-planner.md'), true);
    assert.equal(targetPaths.includes('.claude/agents/sibu-implementation-executor.md'), true);
    assert.equal(targetPaths.includes('.gemini/agents/sibu-implementation-planner.md'), true);
    assert.equal(targetPaths.includes('.gemini/agents/sibu-implementation-executor.md'), true);
    assertNoInvalidTargets(targets);
  });

  it('includes MCP config targets for supported MCP agents only', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [], [], undefined, [], [], SELECTABLE_MCP_SERVERS);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('.codex/config.toml'), true);
    assert.equal(targetPaths.includes('.mcp.json'), true);
    assert.equal(targetPaths.includes('.gemini/settings.json'), true);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.codex/config.toml').length, 1);
    assertNoInvalidTargets(targets);
  });

  it('includes the Layered Architecture skill target when selected', () => {
    const layeredArchitecture = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'layered-architecture');

    assert.ok(layeredArchitecture);

    const targets = getWorkflowTargets(ROOT_PATH, [getSupportedAgent('codex')], [], [], layeredArchitecture);

    assert.equal(getRelativeTargetPaths(targets).includes('.agents/skills/layered-architecture/SKILL.md'), true);
    assertNoInvalidTargets(targets);
  });



  it('includes exporter skill targets when selected', () => {
    const selectedWorkflowSkills = SELECTABLE_WORKFLOW_SKILLS.filter((skill) => skill.id === 'export-to-github' || skill.id === 'export-to-notion');
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [], [], undefined, selectedWorkflowSkills);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('.agents/skills/export-to-github/SKILL.md'), true);
    assert.equal(targetPaths.includes('.agents/skills/export-to-notion/SKILL.md'), true);
    assert.equal(targetPaths.includes('.codex/agents/github-exporter.toml'), true);
    assert.equal(targetPaths.includes('.codex/agents/notion-exporter.toml'), true);
    assert.equal(targetPaths.includes('.claude/agents/github-exporter.md'), true);
    assert.equal(targetPaths.includes('.claude/agents/notion-exporter.md'), true);
    assert.equal(targetPaths.includes('.gemini/agents/github-exporter.md'), true);
    assert.equal(targetPaths.includes('.gemini/agents/notion-exporter.md'), true);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/export-to-github/SKILL.md').length, 1);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/export-to-notion/SKILL.md').length, 1);
    assertNoInvalidTargets(targets);
  });

  it('includes supplemental skill targets without dropping primary skill targets', () => {
    const skillWithSupplementalTargets: SelectableWorkflowSkill = {
      ...getWorkflowSkill('export-to-notion'),
      targetRelativePathsByAgent: {
        codex: '.agents/skills/export-to-notion/SKILL.md',
        claude: '.agents/skills/export-to-notion/SKILL.md',
      },
      supplementalTargetsByAgent: {
        codex: [
          {
            templateRelativePath: 'skills/export-to-notion/SKILL.md',
            targetRelativePath: '.codex/agents/notion-exporter.toml',
          },
        ],
        claude: [
          {
            templateRelativePath: 'skills/export-to-notion/SKILL.md',
            targetRelativePath: '.claude/agents/notion-exporter.md',
          },
        ],
      },
    };

    const targets = getSelectedSkillTargetsForAgents([getSupportedAgent('codex'), getSupportedAgent('claude')], [], [], undefined, [skillWithSupplementalTargets]);

    const targetPaths = targets.map((target) => target.targetRelativePath);

    assert.deepEqual(targetPaths, [
      '.agents/skills/clean-code/SKILL.md',
      '.agents/skills/product-vision-writer/SKILL.md',
      '.agents/skills/business-domain-model-writer/SKILL.md',
      '.agents/skills/capabilities-map-writer/SKILL.md',
      '.agents/skills/deep-module-map-writer/SKILL.md',
      '.agents/skills/feature-brief-writer/SKILL.md',
      '.agents/skills/technical-design-writer/SKILL.md',
      '.agents/skills/scrum-master-planner/SKILL.md',
      '.agents/skills/ai-implementation-planner/SKILL.md',
      '.agents/skills/ai-implementation-planner-toolbox/SKILL.md',
      '.codex/agents/sibu-implementation-planner.toml',
      '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      '.agents/skills/ai-implementation-executor-toolbox/SKILL.md',
      '.codex/agents/sibu-implementation-executor.toml',
      '.agents/skills/feature-idea-capture/SKILL.md',
      '.agents/skills/export-to-notion/SKILL.md',
      '.codex/agents/notion-exporter.toml',
      '.claude/agents/sibu-implementation-planner.md',
      '.claude/agents/sibu-implementation-executor.md',
      '.claude/agents/notion-exporter.md',
    ]);

    const workflowTargets = getWorkflowTargets(ROOT_PATH, [getSupportedAgent('codex'), getSupportedAgent('claude')], [], [], undefined, [skillWithSupplementalTargets]);
    const renderedFiles = renderMissingWorkflowFiles({
      missingTargets: workflowTargets,
      overview: 'Test project.',
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      selectedWorkflowSkills: [skillWithSupplementalTargets],
    });

    assert.equal(renderedFiles.some((file) => file.targetPath === path.join(ROOT_PATH, '.codex/agents/notion-exporter.toml')), true);
    assert.equal(renderedFiles.some((file) => file.targetPath === path.join(ROOT_PATH, '.claude/agents/notion-exporter.md')), true);
    assert.equal(
      renderedFiles.filter((file) => file.targetPath === path.join(ROOT_PATH, '.agents/skills/export-to-notion/SKILL.md')).length,
      1
    );
  });

  it('resolves MCP targets for supported MCP agents', () => {
    assert.deepEqual(getMcpConfigTargetsForAgents(SUPPORTED_AGENTS, SELECTABLE_MCP_SERVERS), [
      {
        targetRelativePath: '.codex/config.toml',
        templateRelativePath: '.codex/config.toml',
        agentId: 'codex',
      },
      {
        targetRelativePath: '.gemini/settings.json',
        templateRelativePath: 'mcp/gemini/settings.json',
        agentId: 'gemini',
      },
      {
        targetRelativePath: '.mcp.json',
        templateRelativePath: 'mcp/claude/.mcp.json',
        agentId: 'claude',
      },
    ]);
  });

  it('resolves Notion-only MCP targets without duplicate config paths', () => {
    const selectedMcpServers = SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'notion');
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [], [], undefined, [], [], selectedMcpServers);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('.codex/config.toml'), true);
    assert.equal(targetPaths.includes('.mcp.json'), true);
    assert.equal(targetPaths.includes('.gemini/settings.json'), true);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.codex/config.toml').length, 1);
    assertNoInvalidTargets(targets);
  });

});

describe('getSelectedAgentsFromState', () => {
  it('ignores unsupported legacy selected agent ids', () => {
    const state: SibuState = {
      sibuVersion: '0.1.0',
      templateVersion: '40',
      generatedAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      selectedAgents: ['legacy-agent'],
      managedFiles: {},
    };

    assert.deepEqual(getSelectedAgentsFromState(state).map((agent) => agent.id), []);
  });
});

describe('getSelectedMcpServersFromState', () => {
  it('resolves selected MCP servers from state', () => {
    const state: SibuState = {
      sibuVersion: '0.1.0',
      templateVersion: '71',
      generatedAt: '2026-05-07T00:00:00.000Z',
      updatedAt: '2026-05-07T00:00:00.000Z',
      selectedAgents: ['codex'],
      selectedMcpServers: ['github', 'notion'],
      managedFiles: {},
    };

    assert.deepEqual(getSelectedMcpServersFromState(state).map((server) => server.id), ['github', 'notion']);
  });
});

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Missing supported agent: ${agentId}`);
  }

  return agent;
}

function getWorkflowSkill(skillId: SelectableWorkflowSkill['id']): SelectableWorkflowSkill {
  const skill = SELECTABLE_WORKFLOW_SKILLS.find((workflowSkill) => workflowSkill.id === skillId);

  if (!skill) {
    throw new Error(`Missing workflow skill: ${skillId}`);
  }

  return skill;
}

function getRelativeTargetPaths(targets: ReturnType<typeof getWorkflowTargets>): string[] {
  return targets.map((target) => path.relative(ROOT_PATH, target.targetPath));
}

function assertNoInvalidTargets(targets: ReturnType<typeof getWorkflowTargets>): void {
  for (const target of targets) {
    assert.notEqual(target.label, undefined);
    assert.notEqual(target.targetPath, undefined);
    assert.notEqual(target.templateRelativePath, undefined);
    assert.equal(target.targetPath.includes('undefined'), false);
  }
}
