import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { SUPPORTED_AGENTS } from './catalog.js';
import { getWorkflowMutationReadiness } from './workflow-mutation-readiness.js';
import type { SelectableArchitectureSkill, SelectableFrameworkSkill, SelectableLanguageSkill, SupportedAgent } from './types.js';
import { getWorkflowTargets, renderMissingWorkflowFiles, writeEkkoState } from './workflow-targets.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getWorkflowMutationReadiness', () => {
  it('is not ready when state is missing', () => {
    const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ekko-readiness-missing-'));
    temporaryRoots.push(rootPath);

    assert.deepEqual(getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.ekko/state.json') }), {
      ok: false,
      message: '.ekko/state.json is missing.',
      hint: 'Run `ekko init` before selecting project skills.',
    });
  });

  it('is ready for a clean initialized repo', () => {
    const rootPath = createCleanInitializedRepo();
    const result = getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.ekko/state.json') });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.state.selectedAgents.includes('codex'), true);
    assert.equal(result.manifest.templateVersion, '39');
    assert.equal(result.previews.every((preview) => preview.status === 'up-to-date'), true);
  });

  it('is not ready when a managed file has local edits', () => {
    const rootPath = createCleanInitializedRepo();
    fs.appendFileSync(path.join(rootPath, 'AGENTS.md'), '\nlocal edit\n', 'utf8');

    const result = getWorkflowMutationReadiness({ rootPath, statePath: path.join(rootPath, '.ekko/state.json') });

    assert.equal(result.ok, false);
    if (result.ok) {
      return;
    }

    assert.equal(result.message, 'Workflow state is not clean enough to select a skill safely.');
    assert.equal(result.actionablePreviews?.some((preview) => preview.relativePath === 'AGENTS.md' && preview.status === 'modified'), true);
  });
});

function createCleanInitializedRepo(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ekko-readiness-clean-'));
  temporaryRoots.push(rootPath);
  const selectedAgents = [getSupportedAgent('codex')];
  const selectedLanguageSkills: SelectableLanguageSkill[] = [];
  const selectedFrameworkSkills: SelectableFrameworkSkill[] = [];
  const selectedArchitectureSkill: SelectableArchitectureSkill | undefined = undefined;
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill);
  const files = renderMissingWorkflowFiles({
    missingTargets: targets,
    overview: 'Test project.',
    selectedLanguageSkills,
    selectedFrameworkSkills,
    selectedArchitectureSkill,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, 'utf8');
  }

  writeEkkoState({ rootPath, statePath: path.join(rootPath, '.ekko/state.json'), selectedAgents, selectedLanguageSkills, selectedFrameworkSkills, selectedArchitectureSkill, targets });

  return rootPath;
}

function getSupportedAgent(agentId: SupportedAgent['id']): SupportedAgent {
  const agent = SUPPORTED_AGENTS.find((supportedAgent) => supportedAgent.id === agentId);

  if (!agent) {
    throw new Error(`Unsupported agent: ${agentId}`);
  }

  return agent;
}
