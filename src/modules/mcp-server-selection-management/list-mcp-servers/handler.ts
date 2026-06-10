import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { SELECTABLE_MCP_SERVERS } from '../../template-catalog/index.js';
import { getProjectContext } from '../../../shared/paths.js';
import { renderIntro } from '../../interactive-guidance/index.js';
import { readStateForDoctor } from '../../workflow-state-ledger/index.js';
import type { SibuState } from '../../../shared/types.js';
import type { ListMcpServersCommand } from './command.js';

type McpServerListItem = {
  name: string;
  id: string;
  description: string;
  source: string;
  selected: boolean;
};

type ListMcpServersDependencies = {
  renderIntro: () => Promise<void>;
  intro: (message: string) => void;
  logMessage: (message: string) => void;
  logWarn: (message: string) => void;
  logInfo: (message: string) => void;
  outro: (message: string) => void;
  getStatePath: () => string;
  readState: (statePath: string) => { ok: true; state: SibuState } | { ok: false; message: string };
};

const defaultDependencies: ListMcpServersDependencies = {
  renderIntro,
  intro,
  logMessage: log.message,
  logWarn: log.warn,
  logInfo: log.info,
  outro,
  getStatePath: () => getProjectContext().statePath,
  readState: readStateForDoctor,
};

export async function handleListMcpServers(_command: ListMcpServersCommand, dependencies: ListMcpServersDependencies = defaultDependencies): Promise<void> {
  await dependencies.renderIntro();
  dependencies.intro(chalk.cyan('Available MCP servers'));

  const statePath = dependencies.getStatePath();
  const stateResult = dependencies.readState(statePath);
  const state = stateResult.ok ? stateResult.state : undefined;

  if (!stateResult.ok) {
    dependencies.logWarn(`${stateResult.message} Showing available MCP servers without project state.`);
    dependencies.logInfo('Run `sibu init` before selecting project MCP servers.');
  }

  dependencies.logInfo('Sibu configures MCP files only; prerequisites, credentials, and provider authentication remain user-owned.');
  dependencies.logMessage(chalk.bold('MCP servers'));

  for (const server of getMcpServerListItems(state)) {
    const marker = server.selected ? chalk.green('● selected') : chalk.dim('○ available');
    console.log(`  ${marker} ${chalk.bold(server.name)} ${chalk.dim(`(${server.id})`)}`);
    console.log(`    ${chalk.dim(server.description)}`);
    console.log(`    ${chalk.dim(`Source: ${server.source}`)}`);
  }

  dependencies.outro(chalk.green('MCP server list ready.'));
}

export function getMcpServerListItems(state: SibuState | undefined): McpServerListItem[] {
  const selectedServerIds = new Set(state?.selectedMcpServers ?? []);

  return SELECTABLE_MCP_SERVERS.map((server) => ({
    name: server.name,
    id: server.id,
    description: server.description,
    source: server.source,
    selected: selectedServerIds.has(server.id),
  }));
}
