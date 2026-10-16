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

  const evals = cli.command('evals').description('Start the local Sibu evals workbench');
  evals.action(() => executeCliCommand(createStartLocalEvalsWorkbenchCommand()));
  evals.command('suites').description('List eval suites and cases as JSON')
    .action(() => executeCliCommand({ type: 'evals:suites' }));
  evals.command('describe <suite>').description('Describe compatible models as JSON')
    .option('--case <case_id>', 'Describe one case')
    .action((suiteId: string, options: { case?: string }) => executeCliCommand({ type: 'evals:describe', suiteId, ...(options.case !== undefined ? { caseId: options.case } : {}) }));
  evals.command('run <suite>').description('Run a suite or one case to a terminal result as JSON')
    .option('--case <case_id>', 'Run one case (default: all cases)')
    .option('--model <model_id>', 'This-run-only evaluation model for one case')
    .option('--judge <model_id>', 'This-run-only judge model for one case')
    .action((suiteId: string, options: { case?: string; model?: string; judge?: string }) => executeCliCommand({
      type: 'evals:run', suiteId, scope: options.case !== undefined ? { type: 'test_case', testCaseId: options.case } : { type: 'all' },
      ...(options.model !== undefined ? { model: options.model } : {}), ...(options.judge !== undefined ? { judgeModel: options.judge } : {}),
    }));
  evals.command('choice <suite>').description('Explicitly set or reset a saved suite or case model as JSON')
    .requiredOption('--role <role>', 'tested or judge')
    .requiredOption('--token <token>', 'Choice token from evals describe')
    .option('--case <case_id>', 'Change one case override (reset inherits the suite choice)')
    .option('--set <model_id>', 'Set saved model')
    .option('--reset', 'Reset saved model')
    .action((suiteId: string, options: { role: string; token: string; case?: string; set?: string; reset?: boolean }) => executeCliCommand({
      type: 'evals:choice', suiteId, role: options.role as 'tested' | 'judge', expectedToken: options.token,
      ...(options.case !== undefined ? { caseId: options.case } : {}),
      action: options.reset ? 'reset' : 'set', ...(options.set !== undefined ? { modelId: options.set } : {}),
    }));
  evals.command('result <suite> <run>').description('Read bounded run evidence as JSON')
    .option('--case <case_id>', 'Selected failed case')
    .option('--attempt <number>', 'Selected attempt (requires --case and --assertion)', Number)
    .option('--assertion <assertion_id>', 'Selected failed assertion (requires --case and --attempt)')
    .option('--field <locator>', 'Retained evidence field (requires a full selection)')
    .option('--offset <byte>', 'UTF-8 byte offset for --field', Number)
    .option('--locator-offset <number>', 'Continue the ordered failed-assertion locator list', Number)
    .action((suiteId: string, runId: string, options: { case?: string; attempt?: number; assertion?: string; field?: string; offset?: number; locatorOffset?: number }) => executeCliCommand({
      type: 'evals:result', suiteId, runId,
      ...(options.case !== undefined ? { caseId: options.case } : {}),
      ...(options.attempt !== undefined ? { attempt: options.attempt } : {}),
      ...(options.assertion !== undefined ? { assertionId: options.assertion } : {}),
      ...(options.field !== undefined ? { field: options.field } : {}),
      ...(options.offset !== undefined ? { offset: options.offset } : {}),
      ...(options.locatorOffset !== undefined ? { locatorOffset: options.locatorOffset } : {}),
    }));

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
  models.action(() => executeCliCommand({ type: 'models:guided' }));
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
