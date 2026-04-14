#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const command = process.argv[2];

type FileToCreate = {
  label: string;
  targetPath: string;
  contents: string;
};

async function main(): Promise<void> {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command !== 'init') {
    console.error(`Unknown command: ${command}`);
    console.error('');
    printHelp();
    process.exitCode = 1;
    return;
  }

  await initProject();
}

async function initProject(): Promise<void> {
  const rootPath = process.cwd();
  const agentsPath = path.join(rootPath, 'AGENTS.md');
  const codexConfigPath = path.join(rootPath, '.codex', 'config.toml');
  const hasAgentsFile = fs.existsSync(agentsPath);
  const hasCodexConfig = fs.existsSync(codexConfigPath);

  if (hasAgentsFile && hasCodexConfig) {
    console.log('I found existing AI workflow files. No changes needed.');
    console.log('- AGENTS.md already exists.');
    console.log('- .codex/config.toml already exists.');
    return;
  }

  console.log('I will make sure this project has the expected AI workflow files.');

  if (hasAgentsFile) {
    console.log('- AGENTS.md already exists. I will keep it unchanged.');
  } else {
    console.log('- AGENTS.md is missing. I will create it.');
  }

  if (hasCodexConfig) {
    console.log('- .codex/config.toml already exists. I will keep it unchanged.');
  } else {
    console.log('- .codex/config.toml is missing. I will create it.');
  }

  console.log('');

  const overview = hasAgentsFile ? undefined : await askForProjectOverview();
  const files = renderMissingWorkflowFiles({
    rootPath,
    agentsPath,
    codexConfigPath,
    overview,
    hasAgentsFile,
    hasCodexConfig,
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    console.log(`Created ${file.label}`);
  }
}

async function askForProjectOverview(): Promise<string> {
  const rl = readline.createInterface({ input, output });

  try {
    return await askRequired(
      rl,
      [
        'Tell me what this project is about.',
        'A short sentence or paragraph is enough.',
        'Example: "A local-first notes app for software teams."',
        '',
        'Project overview: ',
      ].join('\n'),
      'Please enter a short project overview so I can create AGENTS.md.'
    );
  } finally {
    rl.close();
  }
}

function renderMissingWorkflowFiles({
  rootPath,
  agentsPath,
  codexConfigPath,
  overview,
  hasAgentsFile,
  hasCodexConfig,
}: {
  rootPath: string;
  agentsPath: string;
  codexConfigPath: string;
  overview?: string;
  hasAgentsFile: boolean;
  hasCodexConfig: boolean;
}): FileToCreate[] {
  const files: FileToCreate[] = [];

  if (!hasAgentsFile) {
    if (!overview?.trim()) {
      throw new Error('Project overview is required to create AGENTS.md.');
    }

    files.push({
      label: path.relative(rootPath, agentsPath),
      targetPath: agentsPath,
      contents: readTemplate('AGENTS.md').replace('{{PROJECT_OVERVIEW}}', overview.trim()),
    });
  }

  if (!hasCodexConfig) {
    files.push({
      label: path.relative(rootPath, codexConfigPath),
      targetPath: codexConfigPath,
      contents: readTemplate('.codex/config.toml'),
    });
  }

  return files;
}

function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', 'templates', relativePath), 'utf8');
}

async function askRequired(
  rl: readline.Interface,
  question: string,
  emptyMessage: string
): Promise<string> {
  while (true) {
    const answer = await rl.question(question);
    if (answer.trim()) {
      return answer;
    }
    console.log(emptyMessage);
  }
}

function printHelp(): void {
  console.log(`ekko

Usage:
  ekko init

Commands:
  init    Safely initialize or repair missing AI workflow files
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
