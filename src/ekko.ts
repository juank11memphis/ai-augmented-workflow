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
  const existingTargets = [agentsPath, codexConfigPath].filter((targetPath) => fs.existsSync(targetPath));

  if (existingTargets.length > 0) {
    console.error('Ekko found existing AI workflow files in this directory:');
    for (const targetPath of existingTargets) {
      console.error(`- ${path.relative(rootPath, targetPath)}`);
    }
    console.error('This first iteration only initializes brand-new projects and will not overwrite existing files.');
    process.exitCode = 1;
    return;
  }

  console.log('Ekko will create AI workflow files for this project.');
  console.log('- AGENTS.md tells AI coding agents what the project is about and how they should work here.');
  console.log('- .codex/config.toml points Codex at that AGENTS.md file.');
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
      'Please enter a short project overview so Ekko can initialize the workflow files.'
    );
  } finally {
    rl.close();
  }

  const files = renderWorkflowFiles({
    rootPath,
    agentsPath,
    codexConfigPath,
    overview: overview.trim(),
  });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    console.log(`Created ${file.label}`);
  }
}

function renderWorkflowFiles({
  rootPath,
  agentsPath,
  codexConfigPath,
  overview,
}: {
  rootPath: string;
  agentsPath: string;
  codexConfigPath: string;
  overview: string;
}): FileToCreate[] {
  const agentsTemplate = readTemplate('AGENTS.md');
  const codexConfigTemplate = readTemplate('.codex/config.toml');

  return [
    {
      label: path.relative(rootPath, agentsPath),
      targetPath: agentsPath,
      contents: agentsTemplate.replace('{{PROJECT_OVERVIEW}}', overview),
    },
    {
      label: path.relative(rootPath, codexConfigPath),
      targetPath: codexConfigPath,
      contents: codexConfigTemplate,
    },
  ];
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
  init    Initialize a brand-new project with AI workflow files
`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
