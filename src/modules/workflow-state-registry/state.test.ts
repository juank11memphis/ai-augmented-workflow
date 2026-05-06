import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import type { ManagedFileState, SibuState } from '../../shared/types.js';
import { cloneState, hasReviewedTemplateVersion, readExistingState, readStateForDoctor, writeStateFile } from './index.js';

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

function createStateFile(contents: unknown): string {
  const statePath = path.join(createTemporaryRoot(), '.sibu/state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, typeof contents === 'string' ? contents : JSON.stringify(contents), 'utf8');

  return statePath;
}

function createTemporaryRoot(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-state-registry-test-'));
  temporaryRoots.push(rootPath);

  return rootPath;
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
