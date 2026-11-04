import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createProgram } from '../../entrypoints/cli/create-program.js';
import { readTemplate, readTemplateManifest } from './index.js';

const routing = readTemplate('AGENTS.md');
const brd = readTemplate('skills/business-requirements-writer/SKILL.md');

type Capabilities = {
  repository: string;
  issueCreate: boolean;
  issueRead: boolean;
  nativeSubissue: boolean;
  artifactRead: boolean;
  artifactWrite: boolean;
};

const ready: Capabilities = {
  repository: 'owner/project',
  issueCreate: true,
  issueRead: true,
  nativeSubissue: true,
  artifactRead: true,
  artifactWrite: true,
};

// A deterministic contract fixture, not a live agent or GitHub behavior test.
function attemptFeatureStart(remote: string | null, capabilities: Capabilities | null) {
  const writes: string[] = [];
  if (!remote) return { outcome: 'missing-remote', writes };
  if (!capabilities || capabilities.repository !== remote ||
    !capabilities.issueCreate || !capabilities.issueRead || !capabilities.nativeSubissue ||
    !capabilities.artifactRead || !capabilities.artifactWrite) {
    return { outcome: 'missing-mcp', writes };
  }
  writes.push('Feature issue', 'SDD artifact');
  return { outcome: 'published', writes };
}

describe('planned feature readiness guidance contract (not agent behavior)', () => {
  it('distinguishes missing GitHub remote before any MCP check or feature write', () => {
    const result = attemptFeatureStart(null, ready);
    assert.deepEqual(result, { outcome: 'missing-remote', writes: [] });
    assert.match(routing, /Before the first planned Feature issue or artifact, identify this project's GitHub repository from its Git remote/);
    assert.match(routing, /This project has no GitHub repository connected\. No feature was created\. Connect the GitHub repository, then retry/);
  });

  it('blocks missing MCP and every partial capability with zero feature writes or local fallback', () => {
    assert.deepEqual(attemptFeatureStart(ready.repository, null), { outcome: 'missing-mcp', writes: [] });
    for (const capability of ['issueCreate', 'issueRead', 'nativeSubissue', 'artifactRead', 'artifactWrite'] as const) {
      const result = attemptFeatureStart(ready.repository, { ...ready, [capability]: false });
      assert.deepEqual(result, { outcome: 'missing-mcp', writes: [] }, capability);
    }
    assert.match(routing, /issue creation and read, native sub-issue operations, and issue-artifact read and write/);
    assert.match(routing, /A rendered MCP configuration alone is not proof of access/);
    assert.match(routing, /GitHub MCP cannot access the issue features this work needs\. No feature was created\. Configure GitHub MCP, then retry/);
    assert.match(routing, /zero feature writes and no local feature-tracking fallback/);
    assert.match(brd, /create no Feature issue, artifact, or local fallback/);
  });

  it('requires MCP capability in the same repository and keeps host authorization at action boundaries', () => {
    assert.deepEqual(attemptFeatureStart(ready.repository, { ...ready, repository: 'other/project' }), { outcome: 'missing-mcp', writes: [] });
    assert.match(routing, /that same repository/);
    assert.match(routing, /Host permission for each external mutation remains required at its action boundary/);
    assert.match(brd, /normal host mutation permission still applies/);
  });

  it('keeps local setup, maintenance, and narrow fixes independent of GitHub', () => {
    const commands = createProgram().commands.map(command => command.name());
    for (const local of ['init', 'doctor', 'sync']) assert.ok(commands.includes(local), local);
    assert.match(routing, /Local `sibu init`, `sibu doctor`, `sibu sync`, and narrow fixes do not require GitHub/);
    assert.match(brd, /Keep local setup, maintenance, and narrow fixes independent/);
  });

  it('stops after Feature and SDD publication if downstream GitHub planning is unavailable', () => {
    const result = attemptFeatureStart(ready.repository, ready);
    assert.deepEqual(result, { outcome: 'published', writes: ['Feature issue', 'SDD artifact'] });
    assert.match(routing, /After Feature\/SDD publication, do not use local Epic or Story files as a substitute/);
    assert.match(brd, /stop rather than writing local substitutes/);
    assert.equal(result.writes.some(write => /Epic|Story/.test(write)), false);
  });

  it('ships current-version sync notes for both changed managed templates', () => {
    const manifest = readTemplateManifest();
    assert.equal(manifest.templateVersion, '252');
    assert.equal(manifest.templates['AGENTS.md']?.version, '57');
    assert.equal(manifest.templates['skills/business-requirements-writer/SKILL.md']?.version, '5');
    assert.match(manifest.templates['AGENTS.md']?.changes.join(' ') ?? '', /Gates planned feature work/);
    assert.match(manifest.templates['skills/business-requirements-writer/SKILL.md']?.changes.join(' ') ?? '', /Requires GitHub readiness/);
  });
});
