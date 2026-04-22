import { Command as CommanderCommand } from 'commander';

import { SIBU_VERSION } from '../../shared/catalog.js';
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

  return cli;
}
