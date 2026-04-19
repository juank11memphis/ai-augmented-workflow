import { Command as CommanderCommand } from 'commander';

import { EKKO_VERSION } from '../../shared/catalog.js';
import { executeCliCommand } from './execute-command.js';

export function createProgram(): CommanderCommand {
  const cli = new CommanderCommand();

  cli.name('ekko').description('Set up a local AI-augmented development workflow.').version(EKKO_VERSION);

  cli
    .command('init')
    .description('Initialize Ekko workflow files once for a project')
    .action(() => executeCliCommand({ type: 'init' }));

  cli
    .command('doctor')
    .description('Read-only health check for Ekko-managed workflow files')
    .action(() => executeCliCommand({ type: 'doctor' }));

  cli
    .command('sync')
    .description('Interactively review and apply Ekko template updates')
    .action(() => executeCliCommand({ type: 'sync' }));

  const skills = cli.command('skills').description('Manage Ekko workflow skills');

  skills
    .command('list')
    .description('List available Ekko skills')
    .action(() => executeCliCommand({ type: 'skills:list' }));

  skills
    .command('use <skill_name>')
    .description('Add one available selectable skill to a clean Ekko workflow')
    .action((skillName: string) => executeCliCommand({ type: 'skills:use', skillName }));

  skills
    .command('stop <file>')
    .description('Stop managing an Ekko-tracked workflow file')
    .action((file: string) => executeCliCommand({ type: 'skills:stop', file }));

  return cli;
}
