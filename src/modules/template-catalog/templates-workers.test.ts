import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  getTemplateVersion,
  readTemplate,
  readTemplateManifest,
} from './index.js';
import { renderTemplateForSync, renderWorkerToolboxRouting } from './templates.js';

const selectedTypescriptSkill = SELECTABLE_LANGUAGE_SKILLS.find((skill) => skill.id === 'typescript')!;
const selectedReactSkill = SELECTABLE_FRAMEWORK_SKILLS.find((skill) => skill.id === 'react')!;
const selectedCommandPatternSkill = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!;
const selectedPostgresqlSkill = SELECTABLE_DATABASE_SKILLS.find((skill) => skill.id === 'postgresql-expert')!;
const selectedPromptEngineeringSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ai-prompt-engineer-master')!;
const selectedUxSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ux-expert')!;
const selectedNotionExportSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'export-to-notion')!;

describe('AGENTS.md template', () => {




});

describe('worker toolbox routing profiles', () => {



  it('delegates MCP config templates while preserving rendered output shape', () => {
    const rendered = renderTemplateForSync({
      templateRelativePath: 'mcp/claude/.mcp.json',
      currentPath: 'missing-agents.md',
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      selectedMcpServers: SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github'),
    });
    const parsed = JSON.parse(rendered) as { mcpServers?: { github?: { url?: string; headers?: Record<string, string> } } };

    assert.equal(parsed.mcpServers?.github?.url, 'https://api.githubcopilot.com/mcp/');
    assert.equal(parsed.mcpServers?.github?.headers?.Authorization, 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}');
  });
});

describe('Sibu planner worker templates', () => {


});

describe('Sibu executor worker templates', () => {


});
