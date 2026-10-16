import assert from 'node:assert/strict';
import { test } from 'node:test';

import { managedConfigHasLocalEdits, managedConfigSnapshot, mergeManagedConfig } from './managed-config.js';

const CODEX_TEMPLATE = 'model_instructions_file = "../AGENTS.md"\n\n[agents]\nenabled = true\nmax_concurrent_threads_per_session = 2\n\n[mcp_servers.github]\nurl = "https://example.test/mcp"\n';
const CODEX_APPROVAL = '\n[mcp_servers.github.tools.create_pull_request]\napproval_mode = "approve"\n';

test('Codex host approval additions do not count as Sibu changes or disappear on template update', () => {
  const current = CODEX_TEMPLATE + CODEX_APPROVAL;
  const baseline = managedConfigSnapshot('.codex/config.toml', CODEX_TEMPLATE);
  assert.equal(managedConfigHasLocalEdits({
    template: '.codex/config.toml', currentContents: current, expectedContents: CODEX_TEMPLATE,
    recordedEntries: baseline, recordedVersionIsCurrent: true, recordedFileHash: 'old-whole-file-hash',
  }), false);

  const updated = CODEX_TEMPLATE.replace('max_concurrent_threads_per_session = 2', 'max_concurrent_threads_per_session = 3');
  const merged = mergeManagedConfig({ template: '.codex/config.toml', currentContents: current, expectedContents: updated, recordedEntries: baseline });
  assert.match(merged, /max_concurrent_threads_per_session = 3/);
  assert.match(merged, /\[mcp_servers\.github\.tools\.create_pull_request\]\napproval_mode = "approve"/);
  assert.equal(mergeManagedConfig({ template: '.codex/config.toml', currentContents: merged, expectedContents: updated,
    recordedEntries: managedConfigSnapshot('.codex/config.toml', updated) }), merged);
});

test('Codex local changes to owned settings and collisions with new settings block updates', () => {
  const baseline = managedConfigSnapshot('.codex/config.toml', CODEX_TEMPLATE);
  const changedOwned = CODEX_TEMPLATE.replace('enabled = true', 'enabled = false');
  assert.throws(() => mergeManagedConfig({ template: '.codex/config.toml', currentContents: changedOwned,
    expectedContents: CODEX_TEMPLATE, recordedEntries: baseline }), /changed locally/);

  const newExpected = `${CODEX_TEMPLATE}\n[mcp_servers.notion]\nurl = "https://notion.test/mcp"\n`;
  const conflicting = `${CODEX_TEMPLATE}\n[mcp_servers.notion]\nurl = "https://custom.test/mcp"\n`;
  assert.throws(() => mergeManagedConfig({ template: '.codex/config.toml', currentContents: conflicting,
    expectedContents: newExpected, recordedEntries: baseline }), /conflicts with a local setting/);
});

test('removing a selected Codex MCP server does not leave broken host approvals', () => {
  const baseline = managedConfigSnapshot('.codex/config.toml', CODEX_TEMPLATE);
  const withoutGithub = CODEX_TEMPLATE.split('\n[mcp_servers.github]')[0]!;
  const merged = mergeManagedConfig({ template: '.codex/config.toml', currentContents: CODEX_TEMPLATE,
    expectedContents: withoutGithub, recordedEntries: baseline });
  assert.doesNotMatch(merged, /mcp_servers\.github/);
  assert.throws(() => mergeManagedConfig({ template: '.codex/config.toml', currentContents: CODEX_TEMPLATE + CODEX_APPROVAL,
    expectedContents: withoutGithub, recordedEntries: baseline }), /local settings that Sibu does not own/);
});

for (const template of ['.claude/settings.json', '.gemini/settings.json', 'mcp/claude/.mcp.json', 'mcp/gemini/settings.json']) {
  test(`${template} preserves host permissions and unrelated MCP settings`, () => {
    const expected = JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ command: 'sibu doctor' }] }] },
      mcpServers: { github: { url: 'https://example.test/mcp' } } });
    const current = JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ command: 'sibu doctor' }] }, { hooks: [{ command: 'echo user-hook' }] }] },
      mcpServers: { github: { url: 'https://example.test/mcp' }, private: { url: 'https://private.test/mcp' } },
      permissions: { allow: ['mcp__github__read'] } });
    const baseline = managedConfigSnapshot(template, expected);
    assert.equal(managedConfigHasLocalEdits({ template, currentContents: current, expectedContents: expected,
      recordedEntries: baseline, recordedVersionIsCurrent: true, recordedFileHash: 'old-whole-file-hash' }), false);

    const next = expected.replace('https://example.test/mcp', 'https://new.test/mcp');
    const merged = JSON.parse(mergeManagedConfig({ template, currentContents: current, expectedContents: next,
      recordedEntries: baseline })) as { permissions: { allow: string[] }; mcpServers: Record<string, { url: string }>;
      hooks: { SessionStart: Array<{ hooks: Array<{ command: string }> }> } };
    assert.deepEqual(merged.permissions.allow, ['mcp__github__read']);
    assert.equal(merged.mcpServers.private?.url, 'https://private.test/mcp');
    assert.equal(merged.mcpServers.github?.url, 'https://new.test/mcp');
    assert.equal(merged.hooks.SessionStart[1]?.hooks[0]?.command, 'echo user-hook');
  });
}

test('removing a selected JSON MCP server prunes empty objects but blocks a host-owned child', () => {
  const template = '.gemini/settings.json';
  const expected = JSON.stringify({ mcpServers: { github: { url: 'https://example.test/mcp' } } });
  const withoutGithub = JSON.stringify({ mcpServers: {} });
  const baseline = managedConfigSnapshot(template, expected);
  const merged = JSON.parse(mergeManagedConfig({ template, currentContents: expected,
    expectedContents: withoutGithub, recordedEntries: baseline })) as Record<string, unknown>;
  assert.equal(merged.mcpServers, undefined);
  const withLocal = JSON.stringify({ mcpServers: { github: { url: 'https://example.test/mcp', approval: 'ask' } } });
  assert.throws(() => mergeManagedConfig({ template, currentContents: withLocal,
    expectedContents: withoutGithub, recordedEntries: baseline }), /local settings that Sibu does not own/);
});
