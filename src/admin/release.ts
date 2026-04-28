#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { ReleaseCommandResult, ReleaseExecutionResult, ReleasePlan, ReleaseWorkflowCommand, ReleaseWorkflowPorts } from './release-workflow/command.js';
import { previewAndConfirmMaintainerRelease } from './release-workflow/handler.js';

export type ParseReleaseArgsResult =
  | {
      status: 'ok';
      command: ReleaseWorkflowCommand;
    }
  | {
      status: 'help';
      usage: string;
    }
  | {
      status: 'error';
      message: string;
      usage: string;
    };

const USAGE = `Usage: pnpm admin:release -- [--from <ref>] [--to <ref>] [--version <version>] [--date <yyyy-mm-dd>] [--yes] [--dry-run]

Options:
  --from <ref>          Git ref to start from. Defaults to the latest reachable SemVer-like tag.
  --to <ref>            Git ref to end at. Defaults to HEAD.
  --version <version>   Release version override. Accepts MAJOR.MINOR.PATCH with optional leading v.
  --date <yyyy-mm-dd>   Release date for the versioned changelog section.
  --yes                 Print the preview and continue without prompting.
  --dry-run             Print the release plan and perform no writes or side effects.
  --help                Show this help message.
`;

export function parseReleaseArgs(args: string[]): ParseReleaseArgsResult {
  const command: ReleaseWorkflowCommand = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--':
        break;
      case '--help':
      case '-h':
        return { status: 'help', usage: USAGE };
      case '--yes':
        command.assumeYes = true;
        break;
      case '--dry-run':
        command.dryRun = true;
        break;
      case '--from': {
        const value = readFlagValue(args, index, arg);
        if (value.status === 'error') {
          return value.result;
        }
        command.fromRef = value.value;
        index += 1;
        break;
      }
      case '--to': {
        const value = readFlagValue(args, index, arg);
        if (value.status === 'error') {
          return value.result;
        }
        command.toRef = value.value;
        index += 1;
        break;
      }
      case '--version': {
        const value = readFlagValue(args, index, arg);
        if (value.status === 'error') {
          return value.result;
        }
        command.version = value.value;
        index += 1;
        break;
      }
      case '--date': {
        const value = readFlagValue(args, index, arg);
        if (value.status === 'error') {
          return value.result;
        }
        command.date = value.value;
        index += 1;
        break;
      }
      default:
        if (arg?.startsWith('--')) {
          return error(`Unknown option \`${arg}\`.`);
        }

        return error(`Unexpected argument \`${arg ?? ''}\`.`);
    }
  }

  return { status: 'ok', command };
}

export async function runReleaseCli(args = process.argv.slice(2), ports = createTerminalPorts(), cwd = process.cwd()): Promise<number> {
  const parsedArgs = parseReleaseArgs(args);

  if (parsedArgs.status === 'help') {
    ports.print(parsedArgs.usage);
    return 0;
  }

  if (parsedArgs.status === 'error') {
    process.stderr.write(`${parsedArgs.message}\n\n${parsedArgs.usage}`);
    return 1;
  }

  const result = await previewAndConfirmMaintainerRelease(parsedArgs.command, ports, cwd);

  switch (result.status) {
    case 'confirmed':
      printExecutionResult(result.execution, ports);
      return result.execution.status === 'executed' ? 0 : 1;
    case 'dry-run':
      ports.print('\nDry run complete. No changes written.\n');
      return 0;
    case 'declined':
      ports.print('\nRelease declined. No changes written.\n');
      return 0;
    case 'blocked':
      process.stderr.write(`\nRelease planning blocked: ${result.message}\n`);
      return 1;
  }
}

type ReadFlagValueResult =
  | {
      status: 'ok';
      value: string;
    }
  | {
      status: 'error';
      result: ParseReleaseArgsResult;
    };

function readFlagValue(args: string[], index: number, flag: string): ReadFlagValueResult {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    return {
      status: 'error',
      result: error(`Option \`${flag}\` requires a value.`),
    };
  }

  return { status: 'ok', value };
}

function error(message: string): ParseReleaseArgsResult {
  return {
    status: 'error',
    message,
    usage: USAGE,
  };
}

function createTerminalPorts(): ReleaseWorkflowPorts {
  return {
    print(message) {
      process.stdout.write(message);
    },
    async confirmRelease(plan: ReleasePlan) {
      const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const answer = await readline.question(`\nRelease ${plan.targetVersion}? [y/N] `);
        return /^(y|yes)$/i.test(answer.trim());
      } finally {
        readline.close();
      }
    },
    writeFile(path, contents) {
      fs.writeFileSync(path, contents, 'utf8');
    },
    run(command, args) {
      try {
        const stdout = execFileSync(command, args, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        return {
          exitCode: 0,
          stdout,
          stderr: '',
        };
      } catch (error) {
        return commandFailure(error);
      }
    },
  };
}

function printExecutionResult(result: ReleaseExecutionResult, ports: Pick<ReleaseWorkflowPorts, 'print'>): void {
  ports.print('\nRelease execution results:\n');
  for (const completedStep of result.completedSteps) {
    ports.print(`- ${completedStep.message}\n`);
  }

  if (result.status === 'failed') {
    ports.print(`\nRelease failed at ${result.failedStep.name}: ${result.failedStep.message}\n`);
    ports.print(`Recovery: ${result.failedStep.recoveryGuidance}\n`);
    return;
  }

  ports.print('\nRelease completed successfully.\n');
}

function commandFailure(error: unknown): ReleaseCommandResult {
  if (isExecFileError(error)) {
    return {
      exitCode: typeof error.status === 'number' ? error.status : 1,
      stdout: bufferToString(error.stdout),
      stderr: bufferToString(error.stderr),
    };
  }

  return {
    exitCode: 1,
    stderr: error instanceof Error ? error.message : String(error),
  };
}

type ExecFileError = Error & {
  status?: number;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
};

function isExecFileError(error: unknown): error is ExecFileError {
  return typeof error === 'object' && error !== null;
}

function bufferToString(value: Buffer | string | undefined): string {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return value ?? '';
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runReleaseCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`\nRelease workflow failed: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
