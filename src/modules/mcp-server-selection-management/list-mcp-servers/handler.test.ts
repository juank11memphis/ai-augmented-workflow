import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import type { SibuState } from '../../../shared/types.js';
import { getMcpServerListItems, handleListMcpServers } from './handler.js';

const temporaryRoots: string[] = [];
const BASE_STATE: SibuState = {
  sibuVersion: '0.8.0',
  templateVersion: '71',
  generatedAt: '2026-05-07T00:00:00.000Z',
  updatedAt: '2026-05-07T00:00:00.000Z',
  selectedAgents: ['codex'],
  managedFiles: {},
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

describe('getMcpServerListItems', () => {
  it('treats missing optional selected MCP server state as unselected', () => {
    assert.deepEqual(getMcpServerListItems(BASE_STATE), [
      {
        name: 'GitHub MCP Server',
        id: 'github',
        description:
          "Configure GitHub's official MCP server; Sibu writes config only, while prerequisites, runtime availability, credentials, and authentication remain user-owned",
        source: 'github/github-mcp-server',
        selected: false,
      },
    ]);
  });

  it('marks GitHub as selected when state selects it', () => {
    const [githubServer] = getMcpServerListItems({ ...BASE_STATE, selectedMcpServers: ['github'] });

    assert.equal(githubServer?.id, 'github');
    assert.equal(githubServer?.selected, true);
  });
});

describe('handleListMcpServers', () => {
  it('shows available MCP servers without project state and does not create state', async () => {
    const rootPath = createTemporaryRoot();
    const messages: string[] = [];

    await handleListMcpServers(
      { type: 'mcp:list' },
      buildDependencies({
        statePath: path.join(rootPath, '.sibu/state.json'),
        readState: () => ({ ok: false, message: '.sibu/state.json is missing.' }),
        messages,
      })
    );

    assert.equal(fs.existsSync(path.join(rootPath, '.sibu/state.json')), false);
    assert.equal(messages.some((message) => message.includes('Showing available MCP servers without project state')), true);
    assert.equal(messages.some((message) => message.includes('Run `sibu init` before selecting project MCP servers.')), true);
    assert.equal(messages.some((message) => message.includes('prerequisites, credentials, and provider authentication remain user-owned')), true);
  });

  it('shows selected GitHub state without mutating existing state', async () => {
    const rootPath = createTemporaryRoot();
    const statePath = path.join(rootPath, '.sibu/state.json');
    const state: SibuState = { ...BASE_STATE, selectedMcpServers: ['github'] };
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    const before = fs.readFileSync(statePath, 'utf8');
    const messages: string[] = [];

    await handleListMcpServers(
      { type: 'mcp:list' },
      buildDependencies({
        statePath,
        readState: () => ({ ok: true, state }),
        messages,
      })
    );

    assert.equal(fs.readFileSync(statePath, 'utf8'), before);
    assert.equal(messages.some((message) => message.includes('Available MCP servers')), true);
    assert.equal(messages.some((message) => message.includes('MCP server list ready.')), true);
  });
});

function buildDependencies({
  statePath,
  readState,
  messages,
}: {
  statePath: string;
  readState: (statePath: string) => { ok: true; state: SibuState } | { ok: false; message: string };
  messages: string[];
}): Parameters<typeof handleListMcpServers>[1] {
  return {
    renderIntro: async () => undefined,
    intro: (message) => messages.push(message),
    logMessage: (message) => messages.push(message),
    logWarn: (message) => messages.push(message),
    logInfo: (message) => messages.push(message),
    outro: (message) => messages.push(message),
    getStatePath: () => statePath,
    readState,
  };
}

function createTemporaryRoot(): string {
  const rootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-mcp-list-test-'));
  temporaryRoots.push(rootPath);

  return rootPath;
}
