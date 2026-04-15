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
type LanguageSkillId = 'typescript';
type ArchitectureSkillId = 'ddd-hexagonal' | 'command-pattern';

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

type SelectableLanguageSkill = SkillTemplate & {
  id: LanguageSkillId;
  name: string;
  description: string;
  routingInstruction: string;
};

type SelectableArchitectureSkill = SkillTemplate & {
  id: ArchitectureSkillId;
  name: string;
  description: string;
  routingInstruction: string;
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
  selectedLanguageSkills?: LanguageSkillId[];
  reviewedLanguageSkills?: LanguageSkillId[];
  selectedArchitectureSkill?: ArchitectureSkillId;
  reviewedArchitectureSkills?: ArchitectureSkillId[];
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
      codex: '.agents/skills/clean-code/SKILL.md',
      gemini: '.agents/skills/clean-code/SKILL.md',
      claude: '.agents/skills/clean-code/SKILL.md',
    },
  },
];

const SELECTABLE_LANGUAGE_SKILLS: SelectableLanguageSkill[] = [
  {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Install practical guidance for writing and modifying .ts and .tsx files',
    routingInstruction: 'For any task that changes `.ts` or `.tsx` files, also use `typescript`.',
    templateRelativePath: 'skills/typescript/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/typescript/SKILL.md',
      gemini: '.agents/skills/typescript/SKILL.md',
      claude: '.agents/skills/typescript/SKILL.md',
    },
  },
];

const SELECTABLE_ARCHITECTURE_SKILLS: SelectableArchitectureSkill[] = [
  {
    id: 'ddd-hexagonal',
    name: 'DDD + Hexagonal Architecture',
    description: 'Install back-end architecture guidance for DDD, ports/adapters, and inward dependencies',
    routingInstruction:
      'For any back-end work, use `ddd-hexagonal`. This includes new features, refactors, bug fixes, persistence, external integrations, application/service boundaries, domain modeling, and architectural tradeoffs.',
    templateRelativePath: 'skills/architecture/ddd-hexagonal/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/ddd-hexagonal/SKILL.md',
      gemini: '.agents/skills/ddd-hexagonal/SKILL.md',
      claude: '.agents/skills/ddd-hexagonal/SKILL.md',
    },
  },
  {
    id: 'command-pattern',
    name: 'Command Pattern',
    description: 'Install architecture guidance for structuring executable operations as commands and handlers',
    routingInstruction:
      'For work that structures actions, workflows, command handlers, operation dispatch, request processing, or executable tasks, use `command-pattern`.',
    templateRelativePath: 'skills/architecture/command-pattern/SKILL.md',
    targetRelativePathsByAgent: {
      codex: '.agents/skills/command-pattern/SKILL.md',
      gemini: '.agents/skills/command-pattern/SKILL.md',
      claude: '.agents/skills/command-pattern/SKILL.md',
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
  .description('Initialize Ekko workflow files once for a project')
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
  intro(chalk.cyan('Initializing workflow loop'));

  const rootPath = process.cwd();
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);

  if (fs.existsSync(statePath)) {
    const stateResult = readStateForDoctor(statePath);

    if (stateResult.ok) {
      log.success('This project is already initialized with Ekko.');
      log.info('Run `ekko doctor` for a read-only health check.');
      log.info('Run `ekko sync` to review template updates, missing files, or workflow changes.');
      outro(chalk.green('Workflow loop already initialized.'));
      return;
    }

    log.error(stateResult.message);
    log.info(`${STATE_RELATIVE_PATH} already exists, so I will not overwrite it from init.`);
    log.info('Fix or restore the state file before running `ekko doctor` or `ekko sync`.');
    outro(chalk.yellow('Workflow loop needs attention.'));
    process.exitCode = 1;
    return;
  }

  const selectedAgents = await askForSupportedAgents();
  const selectedLanguageSkills = await askForLanguageSkills();
  const selectedArchitectureSkill = await askForArchitectureSkill();
  const targets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedArchitectureSkill);
  const missingTargets = targets.filter((target) => !fs.existsSync(target.targetPath));

  log.message('I will create this project’s initial AI workflow files.');
  for (const target of targets) {
    if (fs.existsSync(target.targetPath)) {
      log.info(`${target.label} already exists. I will keep it unchanged and record it in ${STATE_RELATIVE_PATH}.`);
    } else {
      log.info(`${target.label} is missing. I will create it.`);
    }
  }

  log.info(`${STATE_RELATIVE_PATH} is missing. I will create it.`);

  const shouldAskForOverview = missingTargets.some((target) => target.requiresProjectOverview);
  const overview = shouldAskForOverview ? await askForProjectOverview() : undefined;
  const files = renderMissingWorkflowFiles({ missingTargets, overview, selectedLanguageSkills, selectedArchitectureSkill });

  for (const file of files) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.writeFileSync(file.targetPath, file.contents, { encoding: 'utf8', flag: 'wx' });
    log.success(`Created ${file.label}`);
  }

  writeEkkoState({ rootPath, statePath, selectedAgents, selectedLanguageSkills, selectedArchitectureSkill, targets });
  log.success(`Created ${STATE_RELATIVE_PATH}`);

  outro(chalk.green('Workflow loop initialized.'));
}

async function doctorProject(): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Scanning workflow loop'));

  const rootPath = process.cwd();
  const statePath = path.join(rootPath, STATE_RELATIVE_PATH);
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `ekko init` once to create Ekko workflow metadata.');
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

  log.info('Run `ekko sync` to repair missing managed files, adopt new templates, or review template updates.');
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

  const languageSkillSelection = await askForNewLanguageSkills(stateResult.state);
  const architectureSkillSelection = await askForNewArchitectureSkill(languageSkillSelection.state);
  let state = architectureSkillSelection.state;
  const manifest = readTemplateManifest();
  const previews = getSyncPreviews({ rootPath, state, manifest });
  const actionablePreviews = previews.filter((preview) =>
    ['new-template', 'missing', 'modified', 'update-available', 'modified-with-update', 'unknown-template'].includes(preview.status)
  );

  if (actionablePreviews.length === 0) {
    log.success('No template updates or local drift detected.');

    if (state.templateVersion !== manifest.templateVersion || languageSkillSelection.changedState || architectureSkillSelection.changedState) {
      state = {
        ...state,
        templateVersion: manifest.templateVersion,
        updatedAt: new Date().toISOString(),
      };
      writeStateFile(statePath, state);
      log.success(`Updated ${STATE_RELATIVE_PATH}`);
    } else {
      log.info('No files changed.');
    }

    outro(chalk.green('Workflow loop already in sync.'));
    return;
  }

  log.warn('Workflow sync found items to review.');

  let changedState = languageSkillSelection.changedState || architectureSkillSelection.changedState;
  let changedFiles = false;

  for (const preview of previews) {
    logSyncPreview(preview);

    if (!['new-template', 'missing', 'modified', 'update-available', 'modified-with-update'].includes(preview.status)) {
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
  status: 'up-to-date' | 'new-template' | 'missing' | 'modified' | 'update-available' | 'modified-with-update' | 'unknown-template' | 'unmanaged';
  managedFile: ManagedFileState;
  recordedTemplateVersion?: string;
  currentTemplateVersion?: string;
  changes: string[];
  hasLocalFile?: boolean;
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
  const previews: SyncPreview[] = Object.entries(state.managedFiles).map(([relativePath, managedFile]) => {
    if (managedFile.status === 'unmanaged') {
      return {
        relativePath,
        managedFile,
        status: 'unmanaged' as const,
        recordedTemplateVersion: managedFile.templateVersion,
        changes: [],
      };
    }

    const template = manifest.templates[managedFile.template];

    if (!template) {
      return {
        relativePath,
        managedFile,
        status: 'unknown-template' as const,
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
        status: 'missing' as const,
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: template.changes,
        hasLocalFile,
      };
    }

    if (hasLocalEdits && hasTemplateUpdate) {
      return {
        relativePath,
        managedFile,
        status: 'modified-with-update' as const,
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: template.changes,
        hasLocalFile,
      };
    }

    if (hasLocalEdits) {
      return {
        relativePath,
        managedFile,
        status: 'modified' as const,
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: [],
        hasLocalFile,
      };
    }

    if (hasTemplateUpdate) {
      return {
        relativePath,
        managedFile,
        status: 'update-available' as const,
        recordedTemplateVersion: managedFile.templateVersion,
        currentTemplateVersion: template.version,
        changes: template.changes,
        hasLocalFile,
      };
    }

    return {
      relativePath,
      managedFile,
      status: 'up-to-date' as const,
      recordedTemplateVersion: managedFile.templateVersion,
      currentTemplateVersion: template.version,
      changes: [],
      hasLocalFile,
    };
  });

  const selectedAgents = SUPPORTED_AGENTS.filter((agent) => state.selectedAgents.includes(agent.id));
  const selectedLanguageSkills = SELECTABLE_LANGUAGE_SKILLS.filter((skill) => state.selectedLanguageSkills?.includes(skill.id));
  const selectedArchitectureSkill = getSelectedArchitectureSkillFromState(state);
  const expectedTargets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedArchitectureSkill);

  for (const target of expectedTargets) {
    const relativePath = path.relative(rootPath, target.targetPath);

    if (state.managedFiles[relativePath]) {
      continue;
    }

    const template = manifest.templates[target.templateRelativePath];

    if (!template) {
      previews.push({
        relativePath,
        managedFile: {
          template: target.templateRelativePath,
          templateVersion: 'unknown',
          sha256: '',
        },
        status: 'unknown-template',
        changes: [],
        hasLocalFile: fs.existsSync(target.targetPath),
      });
      continue;
    }

    previews.push({
      relativePath,
      managedFile: {
        template: target.templateRelativePath,
        templateVersion: template.version,
        sha256: '',
        status: 'managed',
      },
      status: 'new-template',
      currentTemplateVersion: template.version,
      changes: template.changes,
      hasLocalFile: fs.existsSync(target.targetPath),
    });
  }

  return previews;
}

function logSyncPreview(preview: SyncPreview): void {
  switch (preview.status) {
    case 'up-to-date':
      log.success(`${preview.relativePath} is up to date.`);
      return;
    case 'new-template':
      if (preview.hasLocalFile) {
        log.warn(`${preview.relativePath} is expected but is not recorded in ${STATE_RELATIVE_PATH}.`);
        log.info('I will not overwrite it automatically. You can start managing it or write the latest template beside it.');
      } else {
        log.warn(`${preview.relativePath} is a new Ekko-managed workflow file.`);
      }
      logTemplateChanges(preview);
      return;
    case 'missing':
      log.error(`${preview.relativePath} is missing.`);
      log.info('You can recreate it from the latest template during this sync.');
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

  if (preview.status === 'missing') {
    const action = await select<SyncAction>({
      message: `What should I do with ${preview.relativePath}?`,
      options: [
        { value: 'apply-update', label: 'Recreate file', hint: 'Write the latest template and update Ekko state.' },
        { value: 'stop-managing', label: 'Stop managing this file', hint: 'Opt this file out of Ekko missing-file warnings.' },
        { value: 'skip', label: 'Skip for now' },
      ],
    });

    return handleSyncActionCancel(action);
  }

  if (preview.status === 'new-template') {
    const options: Array<{ value: SyncAction; label: string; hint?: string }> = preview.hasLocalFile
      ? [
          { value: 'mark-reviewed', label: 'Start managing existing file', hint: 'Keep the file unchanged and record it in Ekko state.' },
          { value: 'write-side-template', label: 'Write latest template beside my file', hint: 'Create a reference copy under .ekko/sync/.' },
          { value: 'skip', label: 'Skip for now' },
        ]
      : [
          { value: 'apply-update', label: 'Create file', hint: 'Write the latest template and record it in Ekko state.' },
          { value: 'skip', label: 'Skip for now' },
        ];

    const action = await select<SyncAction>({
      message: `What should I do with ${preview.relativePath}?`,
      options,
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
  const managedFile = nextState.managedFiles[preview.relativePath] ?? preview.managedFile;
  const targetPath = path.join(rootPath, preview.relativePath);
  const currentTemplateVersion = preview.currentTemplateVersion ?? getTemplateVersion(manifest, managedFile.template);

  switch (action) {
    case 'apply-update': {
      const contents = renderTemplateForSync({
        templateRelativePath: managedFile.template,
        currentPath: targetPath,
        selectedLanguageSkills: getSelectedLanguageSkillsFromState(nextState),
        selectedArchitectureSkill: getSelectedArchitectureSkillFromState(nextState),
      });
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
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
      const contents = renderTemplateForSync({
        templateRelativePath: managedFile.template,
        currentPath: targetPath,
        selectedLanguageSkills: getSelectedLanguageSkillsFromState(state),
        selectedArchitectureSkill: getSelectedArchitectureSkillFromState(state),
      });
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
  selectedLanguageSkills,
  selectedArchitectureSkill,
}: {
  templateRelativePath: string;
  currentPath: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
}): string {
  let contents = readTemplate(templateRelativePath);

  if (contents.includes('{{PROJECT_OVERVIEW}}')) {
    contents = contents.replace('{{PROJECT_OVERVIEW}}', extractProjectOverview(currentPath) ?? 'Describe this project.');
  }

  return renderSkillRouting(contents, selectedLanguageSkills, selectedArchitectureSkill);
}

function getSelectedLanguageSkillsFromState(state: EkkoState): SelectableLanguageSkill[] {
  return SELECTABLE_LANGUAGE_SKILLS.filter((skill) => state.selectedLanguageSkills?.includes(skill.id));
}

function getSelectedArchitectureSkillFromState(state: EkkoState): SelectableArchitectureSkill | undefined {
  return SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === state.selectedArchitectureSkill);
}

function renderSkillRouting(
  contents: string,
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill
): string {
  if (!contents.includes('{{OPTIONAL_SKILL_ROUTING}}')) {
    return contents;
  }

  const optionalRouting = [...selectedLanguageSkills, ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : [])]
    .map((skill) => `- ${skill.routingInstruction}`)
    .join('\n');
  return contents.replace('{{OPTIONAL_SKILL_ROUTING}}', optionalRouting);
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

async function askForLanguageSkills(): Promise<SelectableLanguageSkill[]> {
  const selectedLanguageSkillIds = await multiselect<LanguageSkillId>({
    message: 'Select the languages this project should support.',
    required: false,
    options: SELECTABLE_LANGUAGE_SKILLS.map((skill) => ({
      value: skill.id,
      label: skill.name,
      hint: skill.description,
    })),
  });

  if (isCancel(selectedLanguageSkillIds)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  return SELECTABLE_LANGUAGE_SKILLS.filter((skill) => selectedLanguageSkillIds.includes(skill.id));
}

async function askForArchitectureSkill(): Promise<SelectableArchitectureSkill | undefined> {
  const selectedArchitectureSkillId = await select<ArchitectureSkillId | 'none'>({
    message: 'Select an architecture style for this project.',
    options: [
      { value: 'none', label: 'None', hint: 'Do not install opinionated architecture guidance.' },
      ...SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => ({
        value: skill.id,
        label: skill.name,
        hint: skill.description,
      })),
    ],
  });

  if (isCancel(selectedArchitectureSkillId)) {
    cancel('Initialization cancelled.');
    process.exit(0);
  }

  if (selectedArchitectureSkillId === 'none') {
    return undefined;
  }

  return SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === selectedArchitectureSkillId);
}

async function askForNewLanguageSkills(state: EkkoState): Promise<{ state: EkkoState; changedState: boolean }> {
  const selectedLanguageSkillIds = new Set(state.selectedLanguageSkills ?? []);
  const reviewedLanguageSkillIds = new Set(state.reviewedLanguageSkills ?? []);
  const unreviewedLanguageSkills = SELECTABLE_LANGUAGE_SKILLS.filter(
    (skill) => !selectedLanguageSkillIds.has(skill.id) && !reviewedLanguageSkillIds.has(skill.id)
  );

  if (unreviewedLanguageSkills.length === 0) {
    return { state, changedState: false };
  }

  const selectedNewLanguageSkillIds = await multiselect<LanguageSkillId>({
    message: 'Select any new languages this project should support.',
    required: false,
    options: unreviewedLanguageSkills.map((skill) => ({
      value: skill.id,
      label: skill.name,
      hint: skill.description,
    })),
  });

  if (isCancel(selectedNewLanguageSkillIds)) {
    cancel('Sync cancelled.');
    process.exit(0);
  }

  for (const skill of unreviewedLanguageSkills) {
    reviewedLanguageSkillIds.add(skill.id);
  }

  for (const selectedSkillId of selectedNewLanguageSkillIds) {
    selectedLanguageSkillIds.add(selectedSkillId);
  }

  return {
    state: {
      ...state,
      selectedLanguageSkills: [...selectedLanguageSkillIds],
      reviewedLanguageSkills: [...reviewedLanguageSkillIds],
      updatedAt: new Date().toISOString(),
    },
    changedState: true,
  };
}

async function askForNewArchitectureSkill(state: EkkoState): Promise<{ state: EkkoState; changedState: boolean }> {
  if (state.selectedArchitectureSkill) {
    return { state, changedState: false };
  }

  const reviewedArchitectureSkillIds = new Set(state.reviewedArchitectureSkills ?? []);
  const unreviewedArchitectureSkills = SELECTABLE_ARCHITECTURE_SKILLS.filter((skill) => !reviewedArchitectureSkillIds.has(skill.id));

  if (unreviewedArchitectureSkills.length === 0) {
    return { state, changedState: false };
  }

  const selectedArchitectureSkillId = await select<ArchitectureSkillId | 'none'>({
    message: 'Select an architecture style for this project.',
    options: [
      { value: 'none', label: 'None', hint: 'Do not install opinionated architecture guidance.' },
      ...unreviewedArchitectureSkills.map((skill) => ({
        value: skill.id,
        label: skill.name,
        hint: skill.description,
      })),
    ],
  });

  if (isCancel(selectedArchitectureSkillId)) {
    cancel('Sync cancelled.');
    process.exit(0);
  }

  for (const skill of unreviewedArchitectureSkills) {
    reviewedArchitectureSkillIds.add(skill.id);
  }

  return {
    state: {
      ...state,
      selectedArchitectureSkill: selectedArchitectureSkillId === 'none' ? undefined : selectedArchitectureSkillId,
      reviewedArchitectureSkills: [...reviewedArchitectureSkillIds],
      updatedAt: new Date().toISOString(),
    },
    changedState: true,
  };
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

function getSelectedSkillTargetsForAgents(
  selectedAgents: SupportedAgent[],
  selectedLanguageSkills: SelectableLanguageSkill[],
  selectedArchitectureSkill?: SelectableArchitectureSkill
): SkillTarget[] {
  const skillTargets = new Map<string, SkillTarget>();
  const selectedSkills = [...MANDATORY_SKILLS, ...selectedLanguageSkills, ...(selectedArchitectureSkill ? [selectedArchitectureSkill] : [])];

  for (const agent of selectedAgents) {
    for (const skill of selectedSkills) {
      const targetRelativePath = skill.targetRelativePathsByAgent[agent.id];

      if (!targetRelativePath) {
        continue;
      }

      skillTargets.set(targetRelativePath, {
        targetRelativePath,
        templateRelativePath: skill.templateRelativePath,
      });
    }
  }

  return [...skillTargets.values()];
}

function getWorkflowTargets(
  rootPath: string,
  selectedAgents: SupportedAgent[],
  selectedLanguageSkills: SelectableLanguageSkill[] = [],
  selectedArchitectureSkill?: SelectableArchitectureSkill
): WorkflowTarget[] {
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
    ...getSelectedSkillTargetsForAgents(selectedAgents, selectedLanguageSkills, selectedArchitectureSkill).map((skillTarget) => ({
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
  selectedLanguageSkills,
  selectedArchitectureSkill,
}: {
  missingTargets: WorkflowTarget[];
  overview?: string;
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
}): FileToCreate[] {
  return missingTargets.map((target) => {
    let contents = readTemplate(target.templateRelativePath);

    if (target.requiresProjectOverview) {
      if (!overview?.trim()) {
        throw new Error('Project overview is required to create AGENTS.md.');
      }

      contents = contents.replace('{{PROJECT_OVERVIEW}}', overview.trim());
    }

    contents = renderSkillRouting(contents, selectedLanguageSkills, selectedArchitectureSkill);

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
  selectedLanguageSkills,
  selectedArchitectureSkill,
  targets,
}: {
  rootPath: string;
  statePath: string;
  selectedAgents: SupportedAgent[];
  selectedLanguageSkills: SelectableLanguageSkill[];
  selectedArchitectureSkill?: SelectableArchitectureSkill;
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
    selectedLanguageSkills: selectedLanguageSkills.map((skill) => skill.id),
    reviewedLanguageSkills: SELECTABLE_LANGUAGE_SKILLS.map((skill) => skill.id),
    selectedArchitectureSkill: selectedArchitectureSkill?.id,
    reviewedArchitectureSkills: SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => skill.id),
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

  for (const selectedLanguageSkill of state.selectedLanguageSkills ?? []) {
    if (!SELECTABLE_LANGUAGE_SKILLS.some((skill) => skill.id === selectedLanguageSkill)) {
      issues.push({
        severity: 'warning',
        message: `State references unsupported language skill: ${selectedLanguageSkill}.`,
      });
    }
  }

  for (const reviewedLanguageSkill of state.reviewedLanguageSkills ?? []) {
    if (!SELECTABLE_LANGUAGE_SKILLS.some((skill) => skill.id === reviewedLanguageSkill)) {
      issues.push({
        severity: 'warning',
        message: `State references unsupported reviewed language skill: ${reviewedLanguageSkill}.`,
      });
    }
  }

  if (
    state.selectedArchitectureSkill &&
    !SELECTABLE_ARCHITECTURE_SKILLS.some((skill) => skill.id === state.selectedArchitectureSkill)
  ) {
    issues.push({
      severity: 'warning',
      message: `State references unsupported architecture skill: ${state.selectedArchitectureSkill}.`,
    });
  }

  for (const reviewedArchitectureSkill of state.reviewedArchitectureSkills ?? []) {
    if (!SELECTABLE_ARCHITECTURE_SKILLS.some((skill) => skill.id === reviewedArchitectureSkill)) {
      issues.push({
        severity: 'warning',
        message: `State references unsupported reviewed architecture skill: ${reviewedArchitectureSkill}.`,
      });
    }
  }

  const selectedAgents = SUPPORTED_AGENTS.filter((agent) => state.selectedAgents.includes(agent.id));
  const selectedLanguageSkills = SELECTABLE_LANGUAGE_SKILLS.filter((skill) => state.selectedLanguageSkills?.includes(skill.id));
  const selectedArchitectureSkill = getSelectedArchitectureSkillFromState(state);
  const expectedTargets = getWorkflowTargets(rootPath, selectedAgents, selectedLanguageSkills, selectedArchitectureSkill);
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
        hint: 'Run `ekko sync` to recreate missing managed workflow files.',
      });
      continue;
    }

    if (!managedFile) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} exists but is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'Run `ekko sync` to review and record this workflow file.',
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
          hint: 'Run `ekko sync` to recreate missing managed workflow files.',
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
    (state.selectedLanguageSkills === undefined ||
      (Array.isArray(state.selectedLanguageSkills) && state.selectedLanguageSkills.every((skill) => typeof skill === 'string'))) &&
    (state.reviewedLanguageSkills === undefined ||
      (Array.isArray(state.reviewedLanguageSkills) && state.reviewedLanguageSkills.every((skill) => typeof skill === 'string'))) &&
    (state.selectedArchitectureSkill === undefined || typeof state.selectedArchitectureSkill === 'string') &&
    (state.reviewedArchitectureSkills === undefined ||
      (Array.isArray(state.reviewedArchitectureSkills) && state.reviewedArchitectureSkills.every((skill) => typeof skill === 'string'))) &&
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
