#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cancel, intro, isCancel, log, multiselect, outro, select, text } from '@clack/prompts';
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

type SkillTemplate = {
  templateRelativePath: string;
  targetRelativePathsByAgent: Partial<Record<AgentId, string>>;
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

type EkkoState = {
  ekkoVersion: string;
  templateVersion: string;
  generatedAt: string;
  updatedAt: string;
  selectedAgents: AgentId[];
  managedFiles: Record<string, ManagedFileState>;
};

type ManagedFileStatus = 'managed' | 'customized' | 'unmanaged';

type ManagedFileState = {
  template: string;
  templateVersion: string;
  sha256: string;
  status?: ManagedFileStatus;
  lastReviewedTemplateVersion?: string;
  reason?: string;
};

type DoctorIssue = {
  severity: 'warning' | 'error';
  message: string;
  hint?: string;
};

type TemplateManifest = {
  templateVersion: string;
  templates: Record<string, TemplateManifestEntry>;
};

type TemplateManifestEntry = {
  version: string;
  description: string;
  changes: string[];
};

const EKKO_VERSION = '0.1.0';
const STATE_RELATIVE_PATH = '.ekko/state.json';

const MANDATORY_SKILLS: SkillTemplate[] = [
  {
    templateRelativePath: 'skills/clean-code/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.codex/skills/clean-code/SKILL.md',
      gemini: '.agents/skills/clean-code/SKILL.md',
      claude: '.claude/skills/clean-code/SKILL.md',
    },
  },
];

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
  .version(EKKO_VERSION);

program
  .command('init')
  .description('Safely initialize or repair missing AI workflow files')
  .action(async () => {
    await initProject();
  });

program
  .command('doctor')
  .description('Read-only health check for Ekko-managed workflow files')
  .action(async () => {
    await doctorProject();
  });

program
  .command('sync')
  .description('Interactively review and apply Ekko template updates')
  .action(async () => {
    await syncProject();
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function initProject(): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Synchronizing workflow loop'));

  const rootPath = process.cwd();
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);
  const existingState = readExistingState(statePath);
  const allTargets = getWorkflowTargets(rootPath, SUPPORTED_AGENTS);

  if (allTargets.every((target) => fs.existsSync(target.targetPath))) {
    const allAgentsSelected = existingState
      ? haveSameSelectedAgents(existingState.selectedAgents, SUPPORTED_AGENTS)
      : false;
    const existingIssues = existingState ? diagnoseState({ rootPath, state: existingState }) : [];

    if (existingState && allAgentsSelected && existingIssues.length === 0) {
      log.success('The workflow loop is already fully stable. No changes needed.');
      for (const target of allTargets) {
        log.info(`${target.label} already exists.`);
      }
      log.info(`${STATE_RELATIVE_PATH} already exists.`);
      outro(chalk.green('Workflow loop stable.'));
      return;
    }

    log.message('I found all supported workflow files. I will refresh the loop metadata without changing them.');
    logInitMetadataNotes({ statePath, existingState, targets: allTargets });
    writeEkkoState({ rootPath, statePath, selectedAgents: SUPPORTED_AGENTS, targets: allTargets });
    log.success(`Updated ${STATE_RELATIVE_PATH}`);
    outro(chalk.green('Workflow loop stabilized.'));
    return;
  }

  const selectedAgents = await askForSupportedAgents();
  const targets = getWorkflowTargets(rootPath, selectedAgents);
  const missingTargets = targets.filter((target) => !fs.existsSync(target.targetPath));
  const metadataIssues = getInitMetadataIssues({ existingState, targets });
  const shouldWriteState =
    missingTargets.length > 0 ||
    !existingState ||
    metadataIssues.length > 0 ||
    !haveSameSelectedAgents(existingState.selectedAgents, selectedAgents);

  if (!shouldWriteState) {
    log.success('The selected workflow loop is already stable. No changes needed.');
    for (const target of targets) {
      log.info(`${target.label} already exists.`);
    }
    log.info(`${STATE_RELATIVE_PATH} already exists.`);
    outro(chalk.green('Workflow loop stable.'));
    return;
  }

  log.message('I will tune this project’s selected AI workflow files.');
  for (const target of targets) {
    if (fs.existsSync(target.targetPath)) {
      log.info(`${target.label} already exists. I will keep it unchanged.`);
    } else {
      log.info(`${target.label} is missing. I will create it.`);
    }
  }

  logInitMetadataNotes({ statePath, existingState, targets });

  const shouldAskForOverview = missingTargets.some((target) => target.requiresProjectOverview);
  const overview = shouldAskForOverview ? await askForProjectOverview() : undefined;
  const files = renderMissingWorkflowFiles({ missingTargets, overview });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    log.success(`Created ${file.label}`);
  }

  writeEkkoState({ rootPath, statePath, selectedAgents, targets });
  log.success(`Updated ${STATE_RELATIVE_PATH}`);

  outro(chalk.green('Workflow loop stabilized.'));
}

async function doctorProject(): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Scanning workflow loop'));

  const rootPath = process.cwd();
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `ekko init` to create or repair Ekko workflow metadata.');
    outro(chalk.yellow('Workflow loop needs attention.'));
    process.exitCode = 1;
    return;
  }

  const state = stateResult.state;
  const issues = diagnoseState({ rootPath, state });

  if (issues.length === 0) {
    log.success('Workflow loop is healthy. No drift detected.');
    log.info(`Ekko version: ${state.ekkoVersion}`);
    log.info(`Template version: ${state.templateVersion}`);
    log.info(`Managed files: ${Object.keys(state.managedFiles).length}`);
    log.info(`Statuses: ${formatManagedFileStatusCounts(state)}`);
    outro(chalk.green('Workflow loop stable.'));
    return;
  }

  log.warn('Workflow loop drift detected.');
  for (const issue of issues) {
    if (issue.severity === 'error') {
      log.error(issue.message);
    } else {
      log.warn(issue.message);
    }

    if (issue.hint) {
      log.info(issue.hint);
    }
  }

  log.info('Run `ekko init` to repair missing files or metadata. Run `ekko sync` to review template updates.');
  outro(chalk.yellow('Workflow loop needs attention.'));
  process.exitCode = 1;
}

async function syncProject(): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Previewing workflow sync'));

  const rootPath = process.cwd();
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `ekko init` before syncing so I know which files are managed.');
    outro(chalk.yellow('Workflow sync unavailable.'));
    process.exitCode = 1;
    return;
  }

  let state = stateResult.state;
  const manifest = readTemplateManifest();
  const previews = getSyncPreviews({ rootPath, state, manifest });
  const actionablePreviews = previews.filter((preview) =>
    ['missing', 'modified', 'update-available', 'modified-with-update', 'unknown-template'].includes(preview.status)
  );

  if (actionablePreviews.length === 0) {
    log.success('No template updates or local drift detected.');
    log.info('No files changed.');
    outro(chalk.green('Workflow loop already in sync.'));
    return;
  }

  log.warn('Workflow sync found items to review.');

  let changedState = false;
  let changedFiles = false;

  for (const preview of previews) {
    logSyncPreview(preview);

    if (!['modified', 'update-available', 'modified-with-update'].includes(preview.status)) {
      continue;
    }

    const action = await askForSyncAction(preview);

    if (action === 'skip') {
      log.info(`Skipped ${preview.relativePath}.`);
      continue;
    }

    const result = applySyncAction({ rootPath, state, manifest, preview, action });
    state = result.state;
    changedState = changedState || result.changedState;
    changedFiles = changedFiles || result.changedFiles;
  }

  if (changedState) {
    writeStateFile(statePath, state);
    log.success(`Updated ${STATE_RELATIVE_PATH}`);
  }

  if (!changedFiles && !changedState) {
    log.info('No files changed.');
  }

  outro(chalk.green('Workflow sync complete.'));
}

type SyncPreview = {
  relativePath: string;
  status: 'up-to-date' | 'missing' | 'modified' | 'update-available' | 'modified-with-update' | 'unknown-template' | 'unmanaged';
  managedFile: ManagedFileState;
  recordedTemplateVersion?: string;
  currentTemplateVersion?: string;
  changes: string[];
};

type SyncAction =
  | 'apply-update'
  | 'mark-reviewed'
  | 'write-side-template'
  | 'stop-managing'
  | 'skip';

function getSyncPreviews({
  rootPath,
  state,
  manifest,
}: {
  rootPath: string;
  state: EkkoState;
  manifest: TemplateManifest;
}): SyncPreview[] {
  return Object.entries(state.managedFiles).map(([relativePath, managedFile]) => {
    if (managedFile.status === 'unmanaged') {
      return {
        relativePath,
        managedFile,
        status: 'unmanaged',
        recordedTemplateVersion: managedFile.templateVersion,
        changes: [],
      };
    }

    const template = manifest.templates[managedFile.template];

    if (!template) {
      return {
        relativePath,
        managedFile,
        status: 'unknown-template',
        recordedTemplateVersion: managedFile.templateVersion,
        changes: [],
      };
    }

    const targetPath = path.join(rootPath, relativePath);
    const hasLocalFile = fs.existsSync(targetPath);
    const hasLocalEdits = hasLocalFile
      ? sha256(fs.readFileSync(targetPath, 'utf8')) !== managedFile.sha256
      : false;
    const hasTemplateUpdate = managedFile.templateVersion !== template.version && !hasReviewedTemplateVersion(managedFile, template.version);

    if (!hasLocalFile) {
      return {
        relativePath,
        managedFile,
        status: 'missing',
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: template.changes,
      };
    }

    if (hasLocalEdits && hasTemplateUpdate) {
      return {
        relativePath,
        managedFile,
        status: 'modified-with-update',
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: template.changes,
      };
    }

    if (hasLocalEdits) {
      return {
        relativePath,
        managedFile,
        status: 'modified',
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: [],
      };
    }

    if (hasTemplateUpdate) {
      return {
        relativePath,
        managedFile,
        status: 'update-available',
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: template.changes,
      };
    }

    return {
      relativePath,
      managedFile,
      status: 'up-to-date',
      recordedTemplateVersion: managedFile.templateVersion,
      currentTemplateVersion: template.version,
      changes: [],
    };
  });
}

function logSyncPreview(preview: SyncPreview): void {
  switch (preview.status) {
    case 'up-to-date':
      log.success(`${preview.relativePath} is up to date.`);
      return;
    case 'missing':
      log.error(`${preview.relativePath} is missing.`);
      log.info('Run `ekko init` to recreate missing workflow files before syncing.');
      return;
    case 'modified':
      log.warn(`${preview.relativePath} has local edits.`);
      log.info('I will not overwrite it automatically. No newer template changes were found.');
      return;
    case 'update-available':
      log.warn(`${preview.relativePath} has a newer template available (${preview.recordedTemplateVersion} → ${preview.currentTemplateVersion}).`);
      logTemplateChanges(preview);
      return;
    case 'modified-with-update':
      log.warn(`${preview.relativePath} has local edits and a newer template is available (${preview.recordedTemplateVersion} → ${preview.currentTemplateVersion}).`);
      log.info('I will not overwrite it automatically. Review the template changes below and decide what to adopt.');
      logTemplateChanges(preview);
      return;
    case 'unknown-template':
      log.warn(`${preview.relativePath} references a template that is not in templates/manifest.json.`);
      return;
    case 'unmanaged':
      log.info(`${preview.relativePath} is unmanaged. I will leave it alone.`);
      return;
  }
}

function logTemplateChanges(preview: SyncPreview): void {
  if (preview.changes.length === 0) {
    log.info('No human-readable template changes were recorded for this template.');
    return;
  }

  log.info('New template changes:');
  for (const change of preview.changes) {
    log.info(`- ${change}`);
  }
}

async function askForSyncAction(preview: SyncPreview): Promise<SyncAction> {
  if (preview.status === 'update-available') {
    const action = await select<SyncAction>({
      message: `What should I do with ${preview.relativePath}?`,
      options: [
        { value: 'apply-update', label: 'Apply update', hint: 'Safe because no local edits were detected.' },
        { value: 'skip', label: 'Skip for now' },
      ],
    });

    return handleSyncActionCancel(action);
  }

  const options: Array<{ value: SyncAction; label: string; hint?: string }> = [
    { value: 'mark-reviewed', label: 'Mark as reviewed', hint: 'Keep my file and stop warning about this template version.' },
    { value: 'stop-managing', label: 'Stop managing this file', hint: 'Opt this file out of Ekko template drift warnings.' },
    { value: 'skip', label: 'Skip for now' },
  ];

  if (preview.status === 'modified-with-update') {
    options.splice(1, 0, {
      value: 'write-side-template',
      label: 'Write latest template beside my file',
      hint: 'Create a reference copy under .ekko/sync/.',
    });
  }

  const action = await select<SyncAction>({
    message: `What should I do with ${preview.relativePath}?`,
    options,
  });

  return handleSyncActionCancel(action);
}

function handleSyncActionCancel(action: SyncAction | symbol): SyncAction {
  if (isCancel(action)) {
    cancel('Sync cancelled.');
    process.exit(0);
  }

  return action;
}

function applySyncAction({
  rootPath,
  state,
  manifest,
  preview,
  action,
}: {
  rootPath: string;
  state: EkkoState;
  manifest: TemplateManifest;
  preview: SyncPreview;
  action: SyncAction;
}): { state: EkkoState; changedFiles: boolean; changedState: boolean } {
  const nextState = cloneState(state);
  const managedFile = nextState.managedFiles[preview.relativePath];
  const targetPath = path.join(rootPath, preview.relativePath);
  const currentTemplateVersion = preview.currentTemplateVersion ?? getTemplateVersion(manifest, managedFile.template);

  switch (action) {
    case 'apply-update': {
      const contents = renderTemplateForSync({ templateRelativePath: managedFile.template, currentPath: targetPath });
      fs.writeFileSync(targetPath, contents, 'utf8');
      nextState.templateVersion = manifest.templateVersion;
      nextState.updatedAt = new Date().toISOString();
      nextState.managedFiles[preview.relativePath] = {
        template: managedFile.template,
        templateVersion: currentTemplateVersion,
        sha256: sha256(contents),
        status: 'managed',
      };
      log.success(`Applied latest template to ${preview.relativePath}`);
      return { state: nextState, changedFiles: true, changedState: true };
    }
    case 'mark-reviewed': {
      const contents = fs.readFileSync(targetPath, 'utf8');
      nextState.templateVersion = manifest.templateVersion;
      nextState.updatedAt = new Date().toISOString();
      nextState.managedFiles[preview.relativePath] = {
        ...managedFile,
        sha256: sha256(contents),
        status: 'customized',
        lastReviewedTemplateVersion: currentTemplateVersion,
      };
      log.success(`Marked ${preview.relativePath} as reviewed.`);
      return { state: nextState, changedFiles: false, changedState: true };
    }
    case 'write-side-template': {
      const sideTemplatePath = getSideTemplatePath(rootPath, preview.relativePath, currentTemplateVersion);
      const contents = renderTemplateForSync({ templateRelativePath: managedFile.template, currentPath: targetPath });
      fs.mkdirSync(path.dirname(sideTemplatePath), { recursive: true });
      fs.writeFileSync(sideTemplatePath, contents, 'utf8');
      log.success(`Wrote latest template to ${path.relative(rootPath, sideTemplatePath)}`);
      log.info('Review it and copy over anything you want.');
      return { state, changedFiles: true, changedState: false };
    }
    case 'stop-managing': {
      const contents = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
      nextState.templateVersion = manifest.templateVersion;
      nextState.updatedAt = new Date().toISOString();
      nextState.managedFiles[preview.relativePath] = {
        ...managedFile,
        sha256: sha256(contents),
        status: 'unmanaged',
        lastReviewedTemplateVersion: currentTemplateVersion,
        reason: 'user opted out',
      };
      log.success(`Stopped managing ${preview.relativePath}.`);
      return { state: nextState, changedFiles: false, changedState: true };
    }
    case 'skip':
      return { state, changedFiles: false, changedState: false };
  }
}

function renderTemplateForSync({
  templateRelativePath,
  currentPath,
}: {
  templateRelativePath: string;
  currentPath: string;
}): string {
  let contents = readTemplate(templateRelativePath);

  if (contents.includes('{{PROJECT_OVERVIEW}}')) {
    contents = contents.replace('{{PROJECT_OVERVIEW}}', extractProjectOverview(currentPath) ?? 'Describe this project.');
  }

  return contents;
}

function extractProjectOverview(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const match = contents.match(/## Project overview\s+([\s\S]*?)(?=\n## |$)/);
  const overview = match?.[1]?.trim();
  return overview || undefined;
}

function getSideTemplatePath(rootPath: string, relativePath: string, templateVersion: string): string {
  const safeName = relativePath.replace(/[\\/]/g, '__');
  return path.join(rootPath, '.ekko', 'sync', `${safeName}.template-v${templateVersion}`);
}

function hasReviewedTemplateVersion(managedFile: ManagedFileState, templateVersion: string): boolean {
  return managedFile.lastReviewedTemplateVersion === templateVersion;
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;
}

function cloneState(state: EkkoState): EkkoState {
  return JSON.parse(JSON.stringify(state)) as EkkoState;
}

function writeStateFile(statePath: string, state: EkkoState): void {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function renderIntro(): Promise<void> {
  console.log(gradient(['#39ff14', '#00e5ff', '#9b5de5']).multiline('⧖  E K K O  ⧖'));

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
      <Text color="cyanBright">Loop engine online</Text>
      <Text color="greenBright">Build. Test. Rewind. Improve.</Text>
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
    message: 'Tell me what this timeline is about.',
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

type SkillTarget = {
  targetRelativePath: string;
  templateRelativePath: string;
};

function getSkillTargetsForAgents(selectedAgents: SupportedAgent[]): SkillTarget[] {
  return selectedAgents.flatMap((agent) =>
    MANDATORY_SKILLS.flatMap((skill) => {
      const targetRelativePath = skill.targetRelativePathsByAgent[agent.id];

      if (!targetRelativePath) {
        return [];
      }

      return [
        {
          targetRelativePath,
          templateRelativePath: skill.templateRelativePath,
        },
      ];
    })
  );
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
    ...getSkillTargetsForAgents(selectedAgents).map((skillTarget) => ({
      label: skillTarget.targetRelativePath,
      targetPath: path.join(rootPath, skillTarget.targetRelativePath),
      templateRelativePath: skillTarget.templateRelativePath,
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

function writeEkkoState({
  rootPath,
  statePath,
  selectedAgents,
  targets,
}: {
  rootPath: string;
  statePath: string;
  selectedAgents: SupportedAgent[];
  targets: WorkflowTarget[];
}): void {
  const previousState = readExistingState(statePath);
  const now = new Date().toISOString();
  const manifest = readTemplateManifest();
  const state: EkkoState = {
    ekkoVersion: EKKO_VERSION,
    templateVersion: manifest.templateVersion,
    generatedAt: previousState?.generatedAt ?? now,
    updatedAt: now,
    selectedAgents: selectedAgents.map((agent) => agent.id),
    managedFiles: Object.fromEntries(
      targets
        .filter((target) => fs.existsSync(target.targetPath))
        .map((target) => {
          const relativePath = path.relative(rootPath, target.targetPath);
          const previousManagedFile = previousState?.managedFiles[relativePath];
          const nextManagedFile: ManagedFileState = {
            template: target.templateRelativePath,
            templateVersion: getTemplateVersion(manifest, target.templateRelativePath),
            sha256: sha256(fs.readFileSync(target.targetPath, 'utf8')),
            status: previousManagedFile?.status ?? 'managed',
            lastReviewedTemplateVersion: previousManagedFile?.lastReviewedTemplateVersion,
            reason: previousManagedFile?.reason,
          };

          return [relativePath, removeUndefinedFields(nextManagedFile)];
        })
    ),
  };

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function getInitMetadataIssues({
  existingState,
  targets,
}: {
  existingState?: EkkoState;
  targets: WorkflowTarget[];
}): DoctorIssue[] {
  if (!existingState) {
    return [];
  }

  const issues: DoctorIssue[] = [];

  const manifest = readTemplateManifest();

  if (existingState.templateVersion !== manifest.templateVersion) {
    issues.push({
      severity: 'warning',
      message: `State was generated from template version ${existingState.templateVersion}; current template version is ${manifest.templateVersion}.`,
      hint: 'I will refresh metadata only. I will not upgrade or overwrite existing workflow files yet.',
    });
  }

  for (const target of targets) {
    if (!fs.existsSync(target.targetPath)) {
      continue;
    }

    const relativePath = target.label;
    const managedFile = existingState.managedFiles[relativePath];

    if (!managedFile) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} exists but is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'I will record it in the refreshed metadata.',
      });
      continue;
    }

    const currentHash = sha256(fs.readFileSync(target.targetPath, 'utf8'));
    if (currentHash !== managedFile.sha256) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} appears to have local edits since Ekko last recorded it.`,
        hint: 'I will keep it unchanged and record the current file as the new metadata baseline.',
      });
    }

    const currentTemplateVersion = getTemplateVersion(manifest, managedFile.template)
    if (managedFile.templateVersion !== currentTemplateVersion && !hasReviewedTemplateVersion(managedFile, currentTemplateVersion)) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} was generated from template version ${managedFile.templateVersion}; current template version is ${currentTemplateVersion}.`,
        hint: 'I will refresh metadata only. I will not upgrade or overwrite this file yet.',
      });
    }
  }

  return issues;
}

function logInitMetadataNotes({
  statePath,
  existingState,
  targets,
}: {
  statePath: string;
  existingState?: EkkoState;
  targets: WorkflowTarget[];
}): void {
  const issues = getInitMetadataIssues({ existingState, targets });

  if (fs.existsSync(statePath) && existingState) {
    log.info(`${STATE_RELATIVE_PATH} already exists. I will refresh it with the current loop state.`);
  } else if (fs.existsSync(statePath)) {
    log.warn(`${STATE_RELATIVE_PATH} exists but I could not read it. I will replace it with fresh metadata.`);
  } else {
    log.info(`${STATE_RELATIVE_PATH} is missing. I will create it.`);
  }

  for (const issue of issues) {
    log.warn(issue.message);
    if (issue.hint) {
      log.info(issue.hint);
    }
  }
}

function haveSameSelectedAgents(recordedAgents: AgentId[], selectedAgents: SupportedAgent[]): boolean {
  const selectedAgentIds = selectedAgents.map((agent) => agent.id);
  return (
    recordedAgents.length === selectedAgentIds.length &&
    recordedAgents.every((agentId) => selectedAgentIds.includes(agentId))
  );
}

function diagnoseState({ rootPath, state }: { rootPath: string; state: EkkoState }): DoctorIssue[] {
  const issues: DoctorIssue[] = [];

  const manifest = readTemplateManifest();

  if (state.templateVersion !== manifest.templateVersion) {
    issues.push({
      severity: 'warning',
      message: `State was generated from template version ${state.templateVersion}; current template version is ${manifest.templateVersion}.`,
      hint: 'Run `ekko sync` to review and apply or dismiss template updates.',
    });
  }

  for (const selectedAgent of state.selectedAgents) {
    if (!SUPPORTED_AGENTS.some((agent) => agent.id === selectedAgent)) {
      issues.push({
        severity: 'warning',
        message: `State references unsupported agent: ${selectedAgent}.`,
      });
    }
  }

  const selectedAgents = SUPPORTED_AGENTS.filter((agent) => state.selectedAgents.includes(agent.id));
  const expectedTargets = getWorkflowTargets(rootPath, selectedAgents);
  const reportedMissingPaths = new Set<string>();

  for (const target of expectedTargets) {
    const relativePath = path.relative(rootPath, target.targetPath);
    const managedFile = state.managedFiles[relativePath];

    if (managedFile?.status === 'unmanaged') {
      continue;
    }

    if (!fs.existsSync(target.targetPath)) {
      reportedMissingPaths.add(relativePath);
      issues.push({
        severity: 'error',
        message: `${relativePath} is missing.`,
        hint: 'Run `ekko init` to recreate missing workflow files.',
      });
      continue;
    }

    if (!managedFile) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} exists but is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'Run `ekko init` to refresh Ekko metadata.',
      });
    }
  }

  for (const [relativePath, managedFile] of Object.entries(state.managedFiles)) {
    if (managedFile.status === 'unmanaged') {
      continue;
    }

    const targetPath = path.join(rootPath, relativePath);

    if (!fs.existsSync(targetPath)) {
      if (!reportedMissingPaths.has(relativePath)) {
        issues.push({
          severity: 'error',
          message: `${relativePath} is recorded in ${STATE_RELATIVE_PATH} but is missing.`,
          hint: 'Run `ekko init` to recreate missing workflow files.',
        });
      }
      continue;
    }

    const currentHash = sha256(fs.readFileSync(targetPath, 'utf8'));
    if (currentHash !== managedFile.sha256) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} has changed since Ekko last recorded it.`,
        hint: 'If this was intentional, keep it. `ekko sync` will not overwrite local edits automatically.',
      });
    }

    const currentTemplateVersion = getTemplateVersion(manifest, managedFile.template)
    if (managedFile.templateVersion !== currentTemplateVersion && !hasReviewedTemplateVersion(managedFile, currentTemplateVersion)) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} was generated from template version ${managedFile.templateVersion}; current template version is ${currentTemplateVersion}.`,
        hint: 'Run `ekko sync` to review and apply or dismiss this template update.',
      });
    }
  }

  return issues;
}

function formatManagedFileStatusCounts(state: EkkoState): string {
  const counts = Object.values(state.managedFiles).reduce<Record<ManagedFileStatus, number>>(
    (accumulator, managedFile) => {
      accumulator[managedFile.status ?? 'managed'] += 1;
      return accumulator;
    },
    { managed: 0, customized: 0, unmanaged: 0 }
  );

  return `managed=${counts.managed}, customized=${counts.customized}, unmanaged=${counts.unmanaged}`;
}

type StateReadResult =
  | { ok: true; state: EkkoState }
  | { ok: false; message: string };

function readStateForDoctor(statePath: string): StateReadResult {
  if (!fs.existsSync(statePath)) {
    return { ok: false, message: `${STATE_RELATIVE_PATH} is missing.` };
  }

  try {
    const parsedState = JSON.parse(fs.readFileSync(statePath, 'utf8')) as unknown;

    if (!isEkkoState(parsedState)) {
      return { ok: false, message: `${STATE_RELATIVE_PATH} is not a valid Ekko state file.` };
    }

    return { ok: true, state: parsedState };
  } catch {
    return { ok: false, message: `${STATE_RELATIVE_PATH} could not be parsed.` };
  }
}

function isEkkoState(value: unknown): value is EkkoState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<EkkoState>;

  return (
    typeof state.ekkoVersion === 'string' &&
    typeof state.templateVersion === 'string' &&
    typeof state.generatedAt === 'string' &&
    typeof state.updatedAt === 'string' &&
    Array.isArray(state.selectedAgents) &&
    state.selectedAgents.every((agent) => typeof agent === 'string') &&
    !!state.managedFiles &&
    typeof state.managedFiles === 'object' &&
    Object.values(state.managedFiles).every(isManagedFileState)
  );
}

function isManagedFileState(value: unknown): value is ManagedFileState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const managedFile = value as Partial<ManagedFileState>;
  const validStatuses: ManagedFileStatus[] = ['managed', 'customized', 'unmanaged'];

  return (
    typeof managedFile.template === 'string' &&
    typeof managedFile.templateVersion === 'string' &&
    typeof managedFile.sha256 === 'string' &&
    (managedFile.status === undefined || validStatuses.includes(managedFile.status)) &&
    (managedFile.lastReviewedTemplateVersion === undefined || typeof managedFile.lastReviewedTemplateVersion === 'string') &&
    (managedFile.reason === undefined || typeof managedFile.reason === 'string')
  );
}

function readExistingState(statePath: string): EkkoState | undefined {
  if (!fs.existsSync(statePath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as EkkoState;
  } catch {
    return undefined;
  }
}

function sha256(contents: string): string {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function readTemplate(relativePath: string): string {
  return fs.readFileSync(path.join(getTemplatesPath(), relativePath), 'utf8');
}

function readTemplateManifest(): TemplateManifest {
  const manifest = JSON.parse(fs.readFileSync(path.join(getTemplatesPath(), 'manifest.json'), 'utf8')) as unknown;

  if (!isTemplateManifest(manifest)) {
    throw new Error('templates/manifest.json is not a valid template manifest.');
  }

  return manifest;
}

function getTemplateVersion(manifest: TemplateManifest, templateRelativePath: string): string {
  const template = manifest.templates[templateRelativePath];

  if (!template) {
    throw new Error(`Template ${templateRelativePath} is missing from templates/manifest.json.`);
  }

  return template.version;
}

function getTemplatesPath(): string {
  return path.join(__dirname, '..', 'templates');
}

function isTemplateManifest(value: unknown): value is TemplateManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<TemplateManifest>;

  return (
    typeof manifest.templateVersion === 'string' &&
    !!manifest.templates &&
    typeof manifest.templates === 'object' &&
    Object.values(manifest.templates).every((template) =>
      !!template &&
      typeof template === 'object' &&
      typeof template.version === 'string' &&
      typeof template.description === 'string' &&
      Array.isArray(template.changes) &&
      template.changes.every((change) => typeof change === 'string')
    )
  );
}
