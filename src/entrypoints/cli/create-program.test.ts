import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createProgram } from './create-program.js';

describe('createProgram', () => {
  it('registers machine-readable model route operations', () => {
    const models = createProgram().commands.find((command) => command.name() === 'models');
    assert.ok(models);
    assert.deepEqual(models.commands.map((command) => command.name()), ['resolve', 'set']);
  });
  it('registers the evals command', () => {
    const program = createProgram();
    const evalsCommand = program.commands.find((command) => command.name() === 'evals');

    assert.ok(evalsCommand);
    assert.equal(evalsCommand.description(), 'Start the local Sibu evals workbench');
  });

  it('registers the mcp list command', () => {
    const program = createProgram();
    const mcpCommand = program.commands.find((command) => command.name() === 'mcp');

    assert.ok(mcpCommand);
    assert.equal(mcpCommand.description(), 'Manage Sibu MCP server configuration');
    assert.equal(mcpCommand.commands.some((command) => command.name() === 'list' && command.description() === 'List available MCP servers'), true);
    assert.equal(mcpCommand.commands.some((command) => command.name() === 'use' && command.description() === 'Add one available MCP server to a clean Sibu workflow'), true);
    assert.equal(mcpCommand.commands.some((command) => command.name() === 'stop' && command.description() === 'Stop managing one selected MCP server'), true);
  });
});
