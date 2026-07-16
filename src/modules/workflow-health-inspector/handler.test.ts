import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { writeSibuState } from '../workflow-state-ledger/index.js';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_MCP_SERVERS, SUPPORTED_AGENTS } from '../template-catalog/index.js';
import type { SibuState, SupportedAgent } from '../../shared/types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles } from '../template-catalog/index.js';
import { diagnoseState, getDoctorSyncNextStepLines, getNpmVersionAdvisoryLines } from './handler.js';

const DEEP_MODULE_SKILL_PATH = '.agents/skills/deep-module-map-writer/SKILL.md';
const DEEP_MODULE_MAP_PATH = 'docs/deep-module-map.md';
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('returns advisory lines when a newer version is available', () => {
  const lines = getNpmVersionAdvisoryLines({
    checkedAt: '2026-01-01T00:00:00Z',
    currentVersion: '0.1.0',
    latestVersion: '0.2.0',
    packageName: 'sibu',
    source: 'live',
    status: 'update-available',
  });

  assert.deepEqual(lines, [
    'A newer Sibu version is available: 0.2.0 (0.1.0 installed).',
    'Update with `npm install -g @juancr11/sibu`.',
  ]);
});

test('returns no advisory lines when npm lookup is unavailable', () => {
  const lines = getNpmVersionAdvisoryLines({
    checkedAt: '2026-01-01T00:00:00Z',
    packageName: 'sibu',
    reason: 'network-error',
    source: 'live',
    status: 'unavailable',
  });

  assert.deepEqual(lines, []);
});

test('returns no advisory lines when current version is already up to date', () => {
  const lines = getNpmVersionAdvisoryLines({
    checkedAt: '2026-01-01T00:00:00Z',
    currentVersion: '0.1.0',
    latestVersion: '0.1.0',
    packageName: 'sibu',
    source: 'cache',
    status: 'up-to-date',
  });

  assert.deepEqual(lines, []);
});

test('returns explicit sync next-step lines for review-needed doctor output', () => {
  const lines = getDoctorSyncNextStepLines();

  assert.deepEqual(lines, [
    'Run `sibu sync` to review these workflow changes and choose whether to apply them.',
    'Sibu will not change project files until you explicitly run `sibu sync`.',
  ]);
});

test('diagnoses missing Deep Module Map writer through managed-file drift', () => {
  const rootPath = createCleanInitializedRepo();
  fs.rmSync(path.join(rootPath, DEEP_MODULE_SKILL_PATH));

  const issues = diagnoseState({ rootPath, state: readState(rootPath) });

  assert.equal(
    issues.some((issue) => issue.severity === 'error' && issue.message === `${DEEP_MODULE_SKILL_PATH} is missing.`),
    true
  );
  assert.equal(issues.some((issue) => issue.message.includes(DEEP_MODULE_MAP_PATH)), false);
});

test('diagnoses modified Deep Module Map writer through managed-file drift', () => {
  const rootPath = createCleanInitializedRepo();
  fs.appendFileSync(path.join(rootPath, DEEP_MODULE_SKILL_PATH), '\nLocal edit.\n', 'utf8');

  const issues = diagnoseState({ rootPath, state: readState(rootPath) });

  assert.equal(
    issues.some((issue) => issue.severity === 'warning' && issue.message === `${DEEP_MODULE_SKILL_PATH} has changed since Sibu last recorded it.`),
    true
  );
  assert.equal(issues.some((issue) => issue.message.includes(DEEP_MODULE_MAP_PATH)), false);
});

test('does not manage the generated Deep Module Map artifact', () => {
  const rootPath = createCleanInitializedRepo();
  fs.mkdirSync(path.join(rootPath, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(rootPath, DEEP_MODULE_MAP_PATH), '# Deep Module Map\n', 'utf8');
  const state = readState(rootPath);

  const targets = getWorkflowTargets(rootPath, [getSupportedAgent('codex')]);
  const targetPaths = targets.map((target) => path.relative(rootPath, target.targetPath));
  const issues = diagnoseState({ rootPath, state });

  assert.equal(targetPaths.includes(DEEP_MODULE_MAP_PATH), false);
  assert.equal(state.managedFiles[DEEP_MODULE_MAP_PATH], undefined);
  assert.equal(issues.some((issue) => issue.message.includes(DEEP_MODULE_MAP_PATH)), false);
});

test('diagnoses missing MCP-managed config files through expected targets', () => {
  const rootPath = createCleanInitializedRepoWithGithubMcp();
  fs.rmSync(path.join(rootPath, '.mcp.json'));

  const issues = diagnoseState({ rootPath, state: readState(rootPath) });

  assert.equal(
    issues.some((issue) => issue.severity === 'error' && issue.message === '.mcp.json is missing.'),
    true
  );
});

test('diagnoses modified MCP-managed config files through managed-file drift', () => {
  const rootPath = createCleanInitializedRepoWithGithubMcp();
  fs.appendFileSync(path.join(rootPath, '.mcp.json'), '\nLocal edit.\n', 'utf8');

  const issues = diagnoseState({ rootPath, state: readState(rootPath) });

  assert.equal(
    issues.some((issue) => issue.severity === 'warning' && issue.message === '.mcp.json has changed since Sibu last recorded it.'),
    true
  );
});

test('does not diagnose unmanaged MCP-managed config files as expected target issues', () => {
  const rootPath = createCleanInitializedRepoWithGithubMcp();
  fs.rmSync(path.join(rootPath, '.mcp.json'));
  const state = readState(rootPath);
  state.managedFiles['.mcp.json'].status = 'unmanaged';

  const issues = diagnoseState({ rootPath, state });

  assert.equal(issues.some((issue) => issue.message === '.mcp.json is missing.'), false);
});

test('diagnoses missing managed session-start hook files through expected targets', () => {
  const rootPath = createCleanInitializedRepo();
  fs.rmSync(path.join(rootPath, '.codex/hooks.json'));

  const issues = diagnoseState({ rootPath, state: readState(rootPath) });

  assert.equal(
    issues.some((issue) => issue.severity === 'error' && issue.message === '.codex/hooks.json is missing.'),
    true
  );
});

test('does not diagnose unmanaged session-start hook files as expected target issues', () => {
  const rootPath = createCleanInitializedRepo();
  fs.rmSync(path.join(rootPath, '.codex/hooks.json'));
  const state = readState(rootPath);
  state.managedFiles['.codex/hooks.json'].status = 'unmanaged';

  const issues = diagnoseState({ rootPath, state });

  assert.equal(issues.some((issue) => issue.message === '.codex/hooks.json is missing.'), false);
});

test('warns when legacy state references an unsupported agent', () => {
  const rootPath = createCleanInitializedRepo();
  const state = { ...readState(rootPath), selectedAgents: ['legacy-agent'] };

  const issues = diagnoseState({ rootPath, state });

  assert.equal(issues.some((issue) => issue.message === 'State references unsupported agent: legacy-agent.'), true);
  assert.notEqual(issues.length, 0);
});

test('diagnoses missing selected architecture skill as a sync-repairable error', () => {
  const rootPath = createCleanInitializedRepo();

  const issues = diagnoseState({ rootPath, state: readState(rootPath) });

  assert.equal(
    issues.some(
      (issue) =>
        issue.severity === 'error' &&
        issue.message === 'State is missing a selected architecture skill.' &&
        issue.hint === 'Run `sibu sync` to choose required architecture guidance for this workflow.'
    ),
    true
  );
});

test('preserves unsupported selected architecture skill diagnosis', () => {
  const rootPath = createCleanInitializedRepo();
  const state = { ...readState(rootPath), selectedArchitectureSkill: 'unknown-architecture' as (typeof SELECTABLE_ARCHITECTURE_SKILLS)[number]['id'] };

  const issues = diagnoseState({ rootPath, state });

  assert.equal(issues.some((issue) => issue.severity === 'warning' && issue.message === 'State references unsupported architecture skill: unknown-architecture.'), true);
  assert.equal(issues.some((issue) => issue.message === 'State is missing a selected architecture skill.'), false);
});

test('warns when state references an unsupported MCP server', () => {
  const rootPath = createCleanInitializedRepo();
  const state = { ...readState(rootPath), selectedMcpServers: ['unknown' as 'github'] };

  const issues = diagnoseState({ rootPath, state });

  assert.equal(issues.some((issue) => issue.message === 'State references unsupported MCP server: unknown.'), true);
});

function createCleanInitializedRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-doctor-deep-module-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const targets = getWorkflowTargets(rootPath, selectedAgents);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({
    rootPath,
    statePath: path.join(rootPath, '.sibu/state.json'),
    selectedAgents,
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    targets,
  });

  return rootPath;
}

function createCleanInitializedRepoWithGithubMcp(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-doctor-mcp-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex'), getSupportedAgent('claude'), getSupportedAgent('gemini')];
  const selectedMcpServers = SELECTABLE_MCP_SERVERS;
  const targets = getWorkflowTargets(rootPath, selectedAgents, [], [], undefined, [], [], selectedMcpServers);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedMcpServers,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeSibuState({
    rootPath,
    statePath: path.join(rootPath, '.sibu/state.json'),
    selectedAgents,
    selectedLanguageSkills: [],
    selectedFrameworkSkills: [],
    selectedMcpServers,
    targets,
  });

  return rootPath;
}

function readState(rootPath: string): SibuState {
  return JSON.parse(fs.readFileSync(path.join(rootPath, '.sibu/state.json'), 'utf8')) as SibuState;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}
