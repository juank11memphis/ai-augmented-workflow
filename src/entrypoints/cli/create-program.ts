import { Command as CommanderCommand } from 'commander';

import { ECHO_VERSION } from '../../shared/catalog.js';
import { executeCliCommand } from './execute-command.js';

export function createProgram(): CommanderCommand {
  const cli = new CommanderCommand();

  cli.name('echo').description('Set up a local AI-augmented development workflow.').version(ECHO_VERSION);

  cli
    .command('init')
    .description('Initialize Echo workflow files once for a project')
    .action(() => executeCliCommand({ type: 'init' }));

  cli
    .command('doctor')
    .description('Read-only health check for Echo-managed workflow files')
    .action(() => executeCliCommand({ type: 'doctor' }));

  cli
    .command('sync')
    .description('Interactively review and apply Echo template updates')
    .action(() => executeCliCommand({ type: 'sync' }));

  const skills = cli.command('skills').description('Manage Echo workflow skills');

  skills
    .command('list')
    .description('List available Echo skills')
    .action(() => executeCliCommand({ type: 'skills:list' }));

  skills
    .command('use <skill_name>')
    .description('Add one available selectable skill to a clean Echo workflow')
    .action((skillName: string) => executeCliCommand({ type: 'skills:use', skillName }));

  skills
    .command('stop <skill_name>')
    .description('Stop managing one selected Echo skill')
    .action((skillName: string) => executeCliCommand({ type: 'skills:stop', skillName }));

  return cli;
}
