import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { sha256 } from '../../../shared/hash.js';
import { SibuManagedWorkflowReadinessAdapter } from './workflow-readiness-adapter.js';

// Import path intentionally goes through production adapter behavior; this test creates minimal state files.

describe('SibuManagedWorkflowReadinessAdapter', () => {
  it('allows ordinary project files when Sibu state is unhealthy elsewhere', async () => {
    const root = await projectWithState({ 'AGENTS.md': { sha256: 'old-hash' } });
    const result = await new SibuManagedWorkflowReadinessAdapter().checkReadiness(root, ['src/prompt.md']);
    assert.equal(result.status, 'ready');
  });

  it('blocks managed workflow files when readiness detects drift and gives sync guidance', async () => {
    const root = await projectWithState({ 'AGENTS.md': { sha256: 'old-hash' } });
    const result = await new SibuManagedWorkflowReadinessAdapter().checkReadiness(root, ['AGENTS.md']);
    assert.equal(result.status, 'blocked');
    if (result.status === 'blocked') {
      assert.deepEqual(result.affectedPaths, ['AGENTS.md']);
      assert.match(result.guidance.join('\n'), /sibu sync/);
    }
  });

  it('blocks mutation when present workflow state cannot be parsed', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-readiness-corrupt-'));
    await fs.mkdir(path.join(root, '.sibu'));
    await fs.writeFile(path.join(root, '.sibu/state.json'), '{not-json');
    const result = await new SibuManagedWorkflowReadinessAdapter().checkReadiness(root, ['AGENTS.md']);
    assert.equal(result.status, 'blocked');
  });
});

async function projectWithState(files: Record<string, { readonly sha256: string }>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-readiness-'));
  await fs.mkdir(path.join(root, '.sibu'), { recursive: true });
  for (const file of Object.keys(files)) await fs.writeFile(path.join(root, file), 'changed', 'utf8');
  await fs.writeFile(path.join(root, '.sibu/state.json'), JSON.stringify({
    sibuVersion: '0.0.0', templateVersion: '0', generatedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', selectedAgents: ['codex'], selectedArchitectureSkill: 'command-pattern', managedFiles: Object.fromEntries(Object.entries(files).map(([file, data]) => [file, { template: file, templateVersion: '0', sha256: data.sha256, status: 'managed' }]))
  }), 'utf8');
  assert.notEqual(sha256('changed'), files['AGENTS.md']?.sha256);
  return root;
}
