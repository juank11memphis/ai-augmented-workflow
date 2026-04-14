#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const command = process.argv[2];

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
  const targetPath = path.join(process.cwd(), 'AGENTS.md');

  if (fs.existsSync(targetPath)) {
    console.error('AGENTS.md already exists in this directory.');
    console.error('This first iteration only initializes brand-new projects and will not overwrite existing files.');
    process.exitCode = 1;
    return;
  }

  console.log('Ekko will create an AGENTS.md file for this project.');
  console.log('This file tells AI coding agents what the project is about and how they should work here.');
  console.log('');

  const rl = readline.createInterface({ input, output });
  let overview: string;

  try {
    overview = await askRequired(
      rl,
      [
        'Tell Ekko what this project is about.',
        'A short sentence or paragraph is enough.',
        'Example: "A local-first notes app for software teams."',
        '',
        'Project overview: ',
      ].join('\n'),
      'Please enter a short project overview so Ekko can initialize AGENTS.md.'
    );
  } finally {
    rl.close();
  }

  const templatePath = path.join(__dirname, '..', 'templates', 'AGENTS.md');
  const template = fs.readFileSync(templatePath, 'utf8');
  const rendered = template.replace('{{PROJECT_OVERVIEW}}', overview.trim());

  fs.writeFileSync(targetPath, rendered, { encoding: 'utf8', flag: 'wx' });
  console.log('Created AGENTS.md');
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
  init    Initialize a brand-new project with an AGENTS.md file
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
