import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
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
} from './index.js';
import type { SibuState, SupportedAgent } from '../../shared/types.js';
import { readTemplateManifest } from '../template-catalog-rendering/index.js';
import type { SelectableWorkflowSkill } from '../../shared/types.js';
import { getSelectedAgentsFromState, getSelectedMcpServersFromState, getSelectedMcpTargetsForAgents, getSelectedSkillTargetsForAgents, getWorkflowTargets, renderMissingWorkflowFiles, writeSibuState } from './workflow-targets.js';

const ROOT_PATH = '/test-project';

describe('getWorkflowTargets', () => {
  it('keeps Windsurf-only targets on AGENTS.md and shared skill files', () => {
    const targets = getWorkflowTargets(
      ROOT_PATH,
      [getSupportedAgent('windsurf')],
      [SELECTABLE_LANGUAGE_SKILLS[0]],
      [SELECTABLE_FRAMEWORK_SKILLS[0]],
      SELECTABLE_ARCHITECTURE_SKILLS[0],
      [SELECTABLE_WORKFLOW_SKILLS[0]],
      [SELECTABLE_DATABASE_SKILLS[0]]
    );

    assert.deepEqual(getRelativeTargetPaths(targets), [
      'AGENTS.md',
      '.agents/skills/clean-code/SKILL.md',
      '.agents/skills/product-vision-writer/SKILL.md',
      '.agents/skills/deep-module-map-writer/SKILL.md',
      '.agents/skills/feature-brief-writer/SKILL.md',
      '.agents/skills/technical-design-writer/SKILL.md',
      '.agents/skills/scrum-master-planner/SKILL.md',
      '.agents/skills/ai-implementation-planner/SKILL.md',
      '.agents/skills/ai-implementation-plan-executor/SKILL.md',
      '.agents/skills/feature-idea-capture/SKILL.md',
      '.agents/skills/typescript/SKILL.md',
      '.agents/skills/react/SKILL.md',
      '.agents/skills/postgresql-expert/SKILL.md',
      '.agents/skills/ddd-hexagonal/SKILL.md',
      '.agents/skills/ai-prompt-engineer-master/SKILL.md',
    ]);
    assertNoInvalidTargets(targets);
    assert.equal(getRelativeTargetPaths(targets).some((relativePath) => relativePath.startsWith('.windsurf/')), false);
  });

  it('includes only existing agent support files when every agent is selected', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [SELECTABLE_LANGUAGE_SKILLS[0]]);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('AGENTS.md'), true);
    assert.equal(targetPaths.includes('.codex/config.toml'), true);
    assert.equal(targetPaths.includes('GEMINI.md'), true);
    assert.equal(targetPaths.includes('CLAUDE.md'), true);
    assert.equal(targetPaths.some((relativePath) => relativePath.startsWith('.windsurf/')), false);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.agents/skills/typescript/SKILL.md').length, 1);
    assert.equal(targetPaths.includes('.agents/skills/deep-module-map-writer/SKILL.md'), true);
    assert.equal(targetPaths.includes('.agents/skills/feature-idea-capture/SKILL.md'), true);
    assert.equal(targetPaths.includes('docs/deep-module-map.md'), false);
    assert.equal(targetPaths.includes('docs/feature-ideas.md'), false);
    assertNoInvalidTargets(targets);
  });

  it('includes MCP config targets for supported MCP agents only', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS, [], [], undefined, [], [], SELECTABLE_MCP_SERVERS);
    const targetPaths = getRelativeTargetPaths(targets);

    assert.equal(targetPaths.includes('.codex/config.toml'), true);
    assert.equal(targetPaths.includes('.mcp.json'), true);
    assert.equal(targetPaths.includes('.gemini/settings.json'), true);
    assert.equal(targetPaths.some((relativePath) => relativePath.includes('windsurf')), false);
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
    assert.equal(targetPaths.some((relativePath) => relativePath.startsWith('.windsurf/agents/')), false);
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
      '.agents/skills/deep-module-map-writer/SKILL.md',
      '.agents/skills/feature-brief-writer/SKILL.md',
        '.agents/skills/technical-design-writer/SKILL.md',
        '.agents/skills/scrum-master-planner/SKILL.md',
        '.agents/skills/ai-implementation-planner/SKILL.md',
        '.agents/skills/ai-implementation-plan-executor/SKILL.md',
        '.agents/skills/feature-idea-capture/SKILL.md',
      '.agents/skills/export-to-notion/SKILL.md',
      '.codex/agents/notion-exporter.toml',
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

  it('resolves MCP targets without adding Windsurf MCP config', () => {
    assert.deepEqual(getSelectedMcpTargetsForAgents(SUPPORTED_AGENTS, SELECTABLE_MCP_SERVERS), [
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
    assert.equal(targetPaths.some((relativePath) => relativePath.includes('windsurf')), false);
    assert.equal(targetPaths.filter((relativePath) => relativePath === '.codex/config.toml').length, 1);
    assertNoInvalidTargets(targets);
  });

  it('persists workflow and database skills selected during initialization', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-workflow-targets-'));
    const selectedAgents = [getSupportedAgent('codex')];
    const selectedLanguageSkills = [SELECTABLE_LANGUAGE_SKILLS[0]];
    const selectedFrameworkSkills = [SELECTABLE_FRAMEWORK_SKILLS[0]];
    const selectedArchitectureSkill = SELECTABLE_ARCHITECTURE_SKILLS[0];
    const selectedWorkflowSkills = SELECTABLE_WORKFLOW_SKILLS;
    const selectedDatabaseSkills = SELECTABLE_DATABASE_SKILLS;
    const targets = getWorkflowTargets(
      rootPath,
      selectedAgents,
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
      selectedDatabaseSkills
    );

    const files = renderMissingWorkflowFiles({
      missingTargets: targets,
      overview: 'Test project.',
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
      selectedDatabaseSkills,
    });

    for (const file of files) {
      fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
      fs.writeFileSync(file.targetPath, file.contents, 'utf8');
    }

    const statePath = path.join(rootPath, '.sibu/state.json');
    writeSibuState({
      rootPath,
      statePath,
      selectedAgents,
      selectedLanguageSkills,
      selectedFrameworkSkills,
      selectedArchitectureSkill,
      selectedWorkflowSkills,
      selectedDatabaseSkills,
      targets,
    });

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;

    assert.deepEqual(state.selectedWorkflowSkills, ['ai-prompt-engineer-master', 'ux-expert', 'export-to-github', 'export-to-notion']);
    assert.deepEqual(state.selectedDatabaseSkills, ['postgresql-expert']);
    assert.deepEqual(state.managedFiles['.agents/skills/deep-module-map-writer/SKILL.md'], {
      template: 'skills/deep-module-map-writer/SKILL.md',
      templateVersion: readTemplateManifest().templates['skills/deep-module-map-writer/SKILL.md']?.version,
      sha256: state.managedFiles['.agents/skills/deep-module-map-writer/SKILL.md']?.sha256,
      status: 'managed',
    });
    assert.ok(state.managedFiles['.agents/skills/feature-idea-capture/SKILL.md']);
    assert.ok(state.managedFiles['.agents/skills/ai-prompt-engineer-master/SKILL.md']);
    assert.ok(state.managedFiles['.agents/skills/ux-expert/SKILL.md']);
    assert.ok(state.managedFiles['.agents/skills/export-to-github/SKILL.md']);
    assert.ok(state.managedFiles['.agents/skills/export-to-notion/SKILL.md']);
    assert.ok(state.managedFiles['.agents/skills/postgresql-expert/SKILL.md']);
    assert.equal(state.managedFiles['docs/deep-module-map.md'], undefined);
    assert.equal(state.managedFiles['docs/feature-ideas.md'], undefined);
    assert.equal(fs.existsSync(path.join(rootPath, 'docs/feature-ideas.md')), false);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `feature-idea-capture`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ai-prompt-engineer-master`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ux-expert`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-github`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-notion`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `postgresql-expert`/);

    fs.rmSync(rootPath, { recursive: true, force: true });
  });

  it('renders and persists selected MCP config targets', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-workflow-targets-mcp-'));
    const selectedAgents = [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')];
    const selectedMcpServers = SELECTABLE_MCP_SERVERS;
    const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], undefined, [], [], selectedMcpServers);

    const firstRender = renderMissingWorkflowFiles({
      missingTargets: targets,
      overview: 'Test project.',
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      selectedMcpServers,
    });
    const secondRender = renderMissingWorkflowFiles({
      missingTargets: targets,
      overview: 'Test project.',
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      selectedMcpServers,
    });

    assert.deepEqual(
      firstRender.map((file) => file.contents),
      secondRender.map((file) => file.contents)
    );

    const codexConfig = getRenderedFile(firstRender, '.codex/config.toml', rootPath);
    const claudeConfig = getRenderedFile(firstRender, '.mcp.json', rootPath);
    const geminiConfig = getRenderedFile(firstRender, '.gemini/settings.json', rootPath);

    assert.match(codexConfig.contents, /model_instructions_file = "\.\.\/AGENTS\.md"/);
    assert.match(codexConfig.contents, /\[mcp_servers\.github\]/);
    assert.match(codexConfig.contents, /api\.githubcopilot\.com\/mcp/);
    assert.match(codexConfig.contents, /mcp\.notion\.com\/mcp/);
    assert.match(claudeConfig.contents, /api\.githubcopilot\.com\/mcp/);
    assert.match(claudeConfig.contents, /mcp\.notion\.com\/mcp/);
    assert.match(geminiConfig.contents, /api\.githubcopilot\.com\/mcp/);
    assert.match(geminiConfig.contents, /mcp\.notion\.com\/mcp/);

    for (const file of firstRender) {
      fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
      fs.writeFileSync(file.targetPath, file.contents, 'utf8');
    }

    const statePath = path.join(rootPath, '.sibu/state.json');
    writeSibuState({
      rootPath,
      statePath,
      selectedAgents,
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      selectedMcpServers,
      targets,
    });

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;

    assert.deepEqual(state.selectedMcpServers, ['github', 'notion']);
    assert.equal(state.managedFiles['.codex/config.toml']?.template, '.codex/config.toml');
    assert.equal(state.managedFiles['.mcp.json']?.template, 'mcp/claude/.mcp.json');
    assert.equal(state.managedFiles['.gemini/settings.json']?.template, 'mcp/gemini/settings.json');

    fs.rmSync(rootPath, { recursive: true, force: true });
  });
});

describe('getSelectedAgentsFromState', () => {
  it('resolves Windsurf from selected agent state', () => {
    const state: SibuState = {
      sibuVersion: '0.1.0',
      templateVersion: '40',
      generatedAt: '2026-04-20T00:00:00.000Z',
      updatedAt: '2026-04-20T00:00:00.000Z',
      selectedAgents: ['windsurf'],
      managedFiles: {},
    };

    assert.deepEqual(getSelectedAgentsFromState(state).map((agent) => agent.id), ['windsurf']);
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

function getRenderedFile(files: ReturnType<typeof renderMissingWorkflowFiles>, relativePath: string, rootPath: string): ReturnType<typeof renderMissingWorkflowFiles>[number] {
  const targetPath = path.join(rootPath, relativePath);
  const file = files.find((renderedFile) => renderedFile.targetPath === targetPath);

  if (!file) {
    throw new Error(`Missing rendered file: ${relativePath}`);
  }

  return file;
}
