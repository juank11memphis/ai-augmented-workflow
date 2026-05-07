import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createProgram } from './create-program.js';

describe('createProgram', () => {
  it('registers the mcp list command', () => {
    const program = createProgram();
    const mcpCommand = program.commands.find((command) => command.name() === 'mcp');

    assert.ok(mcpCommand);
    assert.equal(mcpCommand.description(), 'Manage Sibu MCP server configuration');
    assert.equal(mcpCommand.commands.some((command) => command.name() === 'list' && command.description() === 'List available MCP servers'), true);
  });
});
