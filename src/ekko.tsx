#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cancel, intro, isCancel, log, multiselect, outro, text } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import gradient from 'gradient-string';
import { Box, Text, render, useApp } from 'ink';
import React, { useEffect } from 'react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AgentId = 'codex' | 'gemini' | 'claude';

type SupportedAgent = {
  id: AgentId;
  name: string;
  description: string;
  targetRelativePath: string;
  templateRelativePath: string;
};

type FileToCreate = {
  label: string;
  targetPath: string;
  contents: string;
};

type WorkflowTarget = {
  label: string;
  targetPath: string;
  templateRelativePath: string;
  requiresProjectOverview: boolean;
};

const SUPPORTED_AGENTS: SupportedAgent[] = [
  {
    id: 'codex',
    name: 'Codex',
    description: 'Create .codex/config.toml pointing Codex to AGENTS.md',
    targetRelativePath: '.codex/config.toml',
    templateRelativePath: '.codex/config.toml',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Create GEMINI.md that delegates to AGENTS.md',
    targetRelativePath: 'GEMINI.md',
    templateRelativePath: 'GEMINI.md',
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Create CLAUDE.md that delegates to AGENTS.md',
    targetRelativePath: 'CLAUDE.md',
    templateRelativePath: 'CLAUDE.md',
  },
];

const program = new Command();

program
  .name('ekko')
  .description('Set up a local AI-augmented development workflow.')
  .version('0.1.0');

program
  .command('init')
  .description('Safely initialize or repair missing AI workflow files')
  .action(async () => {
    await initProject();
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function initProject(): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Initializing AI workflow'));

  const rootPath = process.cwd();
  const selectedAgents = await askForSupportedAgents();
  const targets = getWorkflowTargets(rootPath, selectedAgents);
  const missingTargets = targets.filter((target) => !fs.existsSync(target.targetPath));

  if (missingTargets.length === 0) {
    log.success('I found all selected AI workflow files. No changes needed.');
    for (const target of targets) {
      log.info(`${target.label} already exists.`);
    }
    outro(chalk.green('Workflow is ready.'));
    return;
  }

  log.message('I will make sure this project has the selected AI workflow files.');
  for (const target of targets) {
    if (fs.existsSync(target.targetPath)) {
      log.info(`${target.label} already exists. I will keep it unchanged.`);
    } else {
      log.info(`${target.label} is missing. I will create it.`);
    }
  }

  const shouldAskForOverview = missingTargets.some((target) => target.requiresProjectOverview);
  const overview = shouldAskForOverview ? await askForProjectOverview() : undefined;
  const files = renderMissingWorkflowFiles({ missingTargets, overview });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    log.success(`Created ${file.label}`);
  }

  outro(chalk.green('AI workflow initialized.'));
}

async function renderIntro(): Promise<void> {
  console.log(gradient(['#00d4ff', '#7c3aed', '#ff4ecd']).multiline('E K K O'));

  const app = render(<IntroPanel />);
  await app.waitUntilExit();
}

function IntroPanel(): React.ReactElement {
  const { exit } = useApp();

  useEffect(() => {
    const timer = setTimeout(exit, 650);
    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column">
      <Text color="cyanBright">AI workflow bootstrapper online</Text>
      <Text color="gray">Build. Test. Rewind. Improve.</Text>
    </Box>
  );
}

async function askForSupportedAgents(): Promise<SupportedAgent[]> {
  const selectedAgentIds = await multiselect<AgentId>({
    message: 'Select the agents this project should support.',
    required: true,
    options: SUPPORTED_AGENTS.map((agent) => ({
      value: agent.id,
      label: agent.name,
      hint: agent.description,
    })),
  });

  if (isCancel(selectedAgentIds)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  return SUPPORTED_AGENTS.filter((agent) => selectedAgentIds.includes(agent.id));
}

async function askForProjectOverview(): Promise<string> {
  const overview = await text({
    message: 'Tell me what this project is about.',
    placeholder: 'A local-first notes app for software teams.',
    validate(value) {
      if (!value?.trim()) {
        return 'Please enter a short project overview so I can create AGENTS.md.';
      }

      return undefined;
    },
  });

  if (isCancel(overview)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  return overview;
}

function getWorkflowTargets(rootPath: string, selectedAgents: SupportedAgent[]): WorkflowTarget[] {
  return [
    {
      label: 'AGENTS.md',
      targetPath: path.join(rootPath, 'AGENTS.md'),
      templateRelativePath: 'AGENTS.md',
      requiresProjectOverview: true,
    },
    ...selectedAgents.map((agent) => ({
      label: agent.targetRelativePath,
      targetPath: path.join(rootPath, agent.targetRelativePath),
      templateRelativePath: agent.templateRelativePath,
      requiresProjectOverview: false,
    })),
  ];
}

function renderMissingWorkflowFiles({
  missingTargets,
  overview,
}: {
  missingTargets: WorkflowTarget[];
  overview?: string;
}): FileToCreate[] {
  return missingTargets.map((target) => {
    let contents = readTemplate(target.templateRelativePath);

    if (target.requiresProjectOverview) {
      if (!overview?.trim()) {
        throw new Error('Project overview is required to create AGENTS.md.');
      }

      contents = contents.replace('{{PROJECT_OVERVIEW}}', overview.trim());
    }

    return {
      label: target.label,
      targetPath: target.targetPath,
      contents,
    };
  });
}

function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', 'templates', relativePath), 'utf8');
}
