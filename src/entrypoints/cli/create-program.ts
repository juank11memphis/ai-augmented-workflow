import { Command as CommanderCommand } from 'commander';

import { createStartLocalEvalsWorkbenchCommand } from '../../modules/local-evals-workbench/index.js';
import { SIBU_VERSION } from '../../support/version-advisory/index.js';
import { executeCliCommand } from './execute-command.js';

export function createProgram(): CommanderCommand {
  const cli = new CommanderCommand();

  cli.name('sibu').description('Set up a local AI-augmented development workflow.').version(SIBU_VERSION);

  cli
    .command('init')
    .description('Initialize Sibu workflow files once for a project')
    .action(() => executeCliCommand({ type: 'init' }));

  cli
    .command('doctor')
    .description('Read-only health check for Sibu-managed workflow files')
    .action(() => executeCliCommand({ type: 'doctor' }));

  cli
    .command('sync')
    .description('Interactively review and apply Sibu template updates')
    .action(() => executeCliCommand({ type: 'sync' }));

  cli
    .command('evals')
    .description('Start the local Sibu evals workbench')
    .action(() => executeCliCommand(createStartLocalEvalsWorkbenchCommand()));

  const skills = cli.command('skills').description('Manage Sibu workflow skills');

  skills
    .command('list')
    .description('List available Sibu skills')
    .action(() => executeCliCommand({ type: 'skills:list' }));

  skills
    .command('use <skill_name>')
    .description('Add one available selectable skill to a clean Sibu workflow')
    .action((skillName: string) => executeCliCommand({ type: 'skills:use', skillName }));

  skills
    .command('stop <skill_name>')
    .description('Stop managing one selected Sibu skill')
    .action((skillName: string) => executeCliCommand({ type: 'skills:stop', skillName }));

  const mcp = cli.command('mcp').description('Manage Sibu MCP server configuration');

  mcp
    .command('list')
    .description('List available MCP servers')
    .action(() => executeCliCommand({ type: 'mcp:list' }));

  mcp
    .command('use <mcp_server_id>')
    .description('Add one available MCP server to a clean Sibu workflow')
    .action((serverId: string) => executeCliCommand({ type: 'mcp:use', serverId }));

  mcp
    .command('stop <mcp_server_id>')
    .description('Stop managing one selected MCP server')
    .action((serverId: string) => executeCliCommand({ type: 'mcp:stop', serverId }));

  const models = cli.command('models').description('Resolve or save explicit model routes');
  models.command('resolve')
    .requiredOption('--agent <environment>')
    .requiredOption('--role <role>')
    .requiredOption('--workload <class>')
    .requiredOption('--json')
    .action((options: { agent: string; role: string; workload: string }) => executeCliCommand({
      type: 'models:resolve', agentEnvironment: options.agent, role: options.role, workloadClass: options.workload,
    }));
  models.command('set')
    .requiredOption('--agent <environment>')
    .requiredOption('--role <role>')
    .requiredOption('--workload <class>')
    .requiredOption('--model <model>')
    .requiredOption('--reasoning <effort>')
    .requiredOption('--catalog-version <version>')
    .requiredOption('--state-basis <token>')
    .requiredOption('--json')
    .action((options: { agent: string; role: string; workload: string; model: string; reasoning: string; catalogVersion: string; stateBasis: string }) => executeCliCommand({
      type: 'models:set', agentEnvironment: options.agent, role: options.role, workloadClass: options.workload,
      model: options.model, reasoningEffort: options.reasoning, catalogVersion: options.catalogVersion, stateBasis: options.stateBasis,
    }));

  return cli;
}
