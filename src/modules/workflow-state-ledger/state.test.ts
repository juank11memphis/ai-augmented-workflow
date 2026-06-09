import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import type { ManagedFileState, SibuState, SupportedAgent } from '../../shared/types.js';
import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
} from '../workflow-target-planning/index.js';
import { getWorkflowTargets, renderMissingWorkflowFiles } from '../workflow-target-planning/workflow-targets.js';
import { readTemplateManifest } from '../template-catalog/index.js';
import { cloneState, hasReviewedTemplateVersion, readExistingState, readStateForDoctor, writeSibuState, writeStateFile } from './index.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('readStateForDoctor', () => {
  it('reads a valid Sibu state file', () => {
    const statePath = createStateFile(buildState());

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: true, state: buildState() });
  });

  it('reports a missing state file', () => {
    const statePath = path.join(createTemporaryRoot(), '.sibu/state.json');

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: false, message: '.sibu/state.json is missing.' });
  });

  it('reports malformed JSON', () => {
    const statePath = createStateFile('{not json');

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: false, message: '.sibu/state.json could not be parsed.' });
  });

  it('reports an invalid state schema', () => {
    const invalidState = { ...buildState(), managedFiles: { 'AGENTS.md': { template: 'AGENTS.md' } } };
    const statePath = createStateFile(invalidState);

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: false, message: '.sibu/state.json is not a valid Sibu state file.' });
  });

  it('accepts selected database skills as an optional state category', () => {
    const state = { ...buildState(), selectedDatabaseSkills: ['postgresql-expert'] };
    const statePath = createStateFile(state);

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: true, state });
  });

  it('rejects invalid selected database skill values', () => {
    const statePath = createStateFile({ ...buildState(), selectedDatabaseSkills: [1] });

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: false, message: '.sibu/state.json is not a valid Sibu state file.' });
  });

  it('accepts selected MCP servers as an optional state category', () => {
    const state = { ...buildState(), selectedMcpServers: ['github'] };
    const statePath = createStateFile(state);

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: true, state });
  });

  it('rejects invalid selected MCP server values', () => {
    const statePath = createStateFile({ ...buildState(), selectedMcpServers: [1] });

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: false, message: '.sibu/state.json is not a valid Sibu state file.' });
  });

  it('accepts Notion MCP server config with a docs parent page', () => {
    const state = { ...buildState(), selectedMcpServers: ['notion'], mcpServerConfigs: { notion: { docsParentPage: 'https://notion.so/example-page' } } };
    const statePath = createStateFile(state);

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: true, state });
  });

  it('rejects malformed Notion MCP server config', () => {
    const statePath = createStateFile({ ...buildState(), selectedMcpServers: ['notion'], mcpServerConfigs: { notion: { docsParentPage: 1 } } });

    const result = readStateForDoctor(statePath);

    assert.deepEqual(result, { ok: false, message: '.sibu/state.json is not a valid Sibu state file.' });
  });
});

describe('readExistingState', () => {
  it('returns parsed state for existing JSON', () => {
    const statePath = createStateFile(buildState());

    assert.deepEqual(readExistingState(statePath), buildState());
  });

  it('returns undefined for missing or malformed state files', () => {
    const rootPath = createTemporaryRoot();
    const missingStatePath = path.join(rootPath, '.sibu/state.json');
    const malformedStatePath = createStateFile('{not json');

    assert.equal(readExistingState(missingStatePath), undefined);
    assert.equal(readExistingState(malformedStatePath), undefined);
  });
});

describe('writeStateFile', () => {
  it('creates parent directories and writes formatted JSON with a trailing newline', () => {
    const statePath = path.join(createTemporaryRoot(), '.sibu/state.json');

    writeStateFile(statePath, buildState());

    assert.equal(fs.readFileSync(statePath, 'utf8'), `${JSON.stringify(buildState(), null, 2)}\n`);
  });
});

describe('cloneState', () => {
  it('returns an independent copy', () => {
    const originalState = buildState();
    const clonedState = cloneState(originalState);

    clonedState.managedFiles['AGENTS.md'].status = 'customized';

    assert.notEqual(clonedState, originalState);
    assert.equal(originalState.managedFiles['AGENTS.md'].status, 'managed');
    assert.equal(clonedState.managedFiles['AGENTS.md'].status, 'customized');
  });
});

describe('hasReviewedTemplateVersion', () => {
  it('checks the managed file last reviewed template version', () => {
    const managedFile: ManagedFileState = {
      template: 'AGENTS.md',
      templateVersion: '68',
      sha256: 'abc123',
      status: 'customized',
      lastReviewedTemplateVersion: '69',
    };

    assert.equal(hasReviewedTemplateVersion(managedFile, '69'), true);
    assert.equal(hasReviewedTemplateVersion(managedFile, '70'), false);
  });
});


describe('writeSibuState', () => {
  it('persists workflow and database skills selected during initialization', () => {
    const rootPath = createTemporaryRoot();
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

    writeRenderedFiles(
      renderMissingWorkflowFiles({
        missingTargets: targets,
        overview: 'Test project.',
        selectedLanguageSkills,
        selectedFrameworkSkills,
        selectedArchitectureSkill,
        selectedWorkflowSkills,
        selectedDatabaseSkills,
      })
    );

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
    assert.deepEqual(state.managedFiles['.agents/skills/business-domain-model-writer/SKILL.md'], {
      template: 'skills/business-domain-model-writer/SKILL.md',
      templateVersion: readTemplateManifest().templates['skills/business-domain-model-writer/SKILL.md']?.version,
      sha256: state.managedFiles['.agents/skills/business-domain-model-writer/SKILL.md']?.sha256,
      status: 'managed',
    });
    assert.deepEqual(state.managedFiles['.agents/skills/capabilities-map-writer/SKILL.md'], {
      template: 'skills/capabilities-map-writer/SKILL.md',
      templateVersion: readTemplateManifest().templates['skills/capabilities-map-writer/SKILL.md']?.version,
      sha256: state.managedFiles['.agents/skills/capabilities-map-writer/SKILL.md']?.sha256,
      status: 'managed',
    });
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
    assert.equal(state.managedFiles['docs/business-domain-model.md'], undefined);
    assert.equal(state.managedFiles['docs/capabilities-map.md'], undefined);
    assert.equal(state.managedFiles['docs/deep-module-map.md'], undefined);
    assert.equal(state.managedFiles['docs/feature-ideas.md'], undefined);
    assert.equal(fs.existsSync(path.join(rootPath, 'docs/business-domain-model.md')), false);
    assert.equal(fs.existsSync(path.join(rootPath, 'docs/capabilities-map.md')), false);
    assert.equal(fs.existsSync(path.join(rootPath, 'docs/feature-ideas.md')), false);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `feature-idea-capture`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ai-prompt-engineer-master`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `ux-expert`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-github`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `export-to-notion`/);
    assert.match(fs.readFileSync(path.join(rootPath, 'AGENTS.md'), 'utf8'), /use `postgresql-expert`/);
  });

  it('persists selected MCP config targets and selected MCP server ids', () => {
    const rootPath = createTemporaryRoot();
    const selectedAgents = [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')];
    const selectedMcpServers = SELECTABLE_MCP_SERVERS;
    const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], undefined, [], [], selectedMcpServers);

    writeRenderedFiles(
      renderMissingWorkflowFiles({
        missingTargets: targets,
        overview: 'Test project.',
        selectedLanguageSkills: [],
        selectedFrameworkSkills: [],
        selectedMcpServers,
      })
    );

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
    assert.equal(state.managedFiles['.gemini/settings.json']?.template, '.gemini/settings.json');
  });

  it('preserves existing managed file metadata and MCP configs while updating state', () => {
    const rootPath = createTemporaryRoot();
    const statePath = path.join(rootPath, '.sibu/state.json');
    const selectedAgents = [getSupportedAgent('codex')];
    const targets = getWorkflowTargets(rootPath, selectedAgents);
    const agentsTarget = targets.find((target) => target.label === 'AGENTS.md');

    if (!agentsTarget) {
      throw new Error('Missing AGENTS.md target.');
    }

    fs.writeFileSync(path.join(rootPath, 'AGENTS.md'), 'Updated AGENTS file', 'utf8');
    writeStateFile(statePath, {
      ...buildState(),
      generatedAt: '2026-01-01T00:00:00.000Z',
      mcpServerConfigs: { notion: { docsParentPage: 'https://notion.so/example-page' } },
      managedFiles: {
        'AGENTS.md': {
          template: 'AGENTS.md',
          templateVersion: '1',
          sha256: 'previous-hash',
          status: 'customized',
          lastReviewedTemplateVersion: '2',
          reason: 'local edits',
        },
      },
    });

    writeSibuState({
      rootPath,
      statePath,
      selectedAgents,
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      targets: [agentsTarget],
    });

    const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as SibuState;

    assert.equal(state.generatedAt, '2026-01-01T00:00:00.000Z');
    assert.deepEqual(state.mcpServerConfigs, { notion: { docsParentPage: 'https://notion.so/example-page' } });
    assert.equal(state.managedFiles['AGENTS.md'].status, 'customized');
    assert.equal(state.managedFiles['AGENTS.md'].lastReviewedTemplateVersion, '2');
    assert.equal(state.managedFiles['AGENTS.md'].reason, 'local edits');
    assert.notEqual(state.managedFiles['AGENTS.md'].sha256, 'previous-hash');
  });
});

function createStateFile(contents: unknown): string {
  const statePath = path.join(createTemporaryRoot(), '.sibu/state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, typeof contents === 'string' ? contents : JSON.stringify(contents), 'utf8');

  return statePath;
}

function createTemporaryRoot(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-state-ledger-test-'));
  temporaryRoots.push(rootPath);

  return rootPath;
}

function writeRenderedFiles(files: ReturnType<typeof renderMissingWorkflowFiles>): void {
  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Missing supported agent: ${agentId}`);
  }

  return agent;
}

function buildState(): SibuState {
  return {
    sibuVersion: '0.1.0',
    templateVersion: '69',
    generatedAt: '2026-05-06T00:00:00.000Z',
    updatedAt: '2026-05-06T00:00:00.000Z',
    selectedAgents: ['codex'],
    selectedLanguageSkills: ['typescript'],
    selectedFrameworkSkills: [],
    managedFiles: {
      'AGENTS.md': {
        template: 'AGENTS.md',
        templateVersion: '69',
        sha256: 'abc123',
        status: 'managed',
      },
    },
  };
}
