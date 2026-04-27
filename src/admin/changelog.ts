#!/usr/bin/env node

import { createInterface } from 'node:readline/promises';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { GenerateChangelogCommand, GenerateChangelogWritePorts } from './generate-changelog/command.js';
import { handleGenerateChangelogWrite } from './generate-changelog/handler.js';

export type ParseChangelogArgsResult =
  | {
      status: 'ok';
      command: GenerateChangelogCommand;
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

const USAGE = `Usage: pnpm admin:changelog -- [--from <ref>] [--to <ref>] [--version <version>] [--date <yyyy-mm-dd>] [--yes]

Options:
  --from <ref>          Git ref to start from. Defaults to the latest reachable tag.
  --to <ref>            Git ref to end at. Defaults to HEAD.
  --version <version>   Release version. Accepts MAJOR.MINOR.PATCH with optional leading v.
  --date <yyyy-mm-dd>   Release date for a versioned changelog section.
  --yes                 Print the preview and write without prompting.
  --help                Show this help message.
`;

export function parseChangelogArgs(args: string[]): ParseChangelogArgsResult {
  const command: GenerateChangelogCommand = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--help':
      case '-h':
        return { status: 'help', usage: USAGE };
      case '--yes':
        command.assumeYes = true;
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

export async function runChangelogCli(args = process.argv.slice(2), cwd = process.cwd()): Promise<number> {
  const parsedArgs = parseChangelogArgs(args);

  if (parsedArgs.status === 'help') {
    process.stdout.write(parsedArgs.usage);
    return 0;
  }

  if (parsedArgs.status === 'error') {
    process.stderr.write(`${parsedArgs.message}\n\n${parsedArgs.usage}`);
    return 1;
  }

  const result = await handleGenerateChangelogWrite(parsedArgs.command, createTerminalPorts(), cwd);

  switch (result.status) {
    case 'written':
      process.stdout.write(`\nWrote ${result.changelogPath}\n`);
      return 0;
    case 'declined':
      process.stdout.write('\nNo changes written.\n');
      return 0;
    case 'blocked':
      process.stderr.write(`\nChangelog generation blocked: ${result.message}\n`);
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
      result: ParseChangelogArgsResult;
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

function error(message: string): ParseChangelogArgsResult {
  return {
    status: 'error',
    message,
    usage: USAGE,
  };
}

function createTerminalPorts(): GenerateChangelogWritePorts {
  return {
    readFile(path) {
      if (!fs.existsSync(path)) {
        return undefined;
      }

      return fs.readFileSync(path, 'utf8');
    },
    writeFile(path, content) {
      fs.writeFileSync(path, content, 'utf8');
    },
    async confirmWrite() {
      const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      try {
        const answer = await readline.question('\nWrite CHANGELOG.md with these changes? [y/N] ');
        return /^(y|yes)$/i.test(answer.trim());
      } finally {
        readline.close();
      }
    },
    showPreview(preview) {
      process.stdout.write(preview);
    },
  };
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runChangelogCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`\nChangelog generation failed: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
