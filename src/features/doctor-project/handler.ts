import fs from 'node:fs';
import path from 'node:path';

import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS, STATE_RELATIVE_PATH, SUPPORTED_AGENTS } from '../../shared/catalog.js';
import { sha256 } from '../../shared/hash.js';
import { getProjectContext } from '../../shared/paths.js';
import { renderIntro } from '../../shared/prompts.js';
import { hasReviewedTemplateVersion, readStateForDoctor } from '../../shared/state.js';
import { getTemplateVersion, readTemplateManifest } from '../../shared/templates.js';
import type { DoctorIssue, EchoState, ManagedFileStatus } from '../../shared/types.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getWorkflowTargets,
} from '../../shared/workflow-targets.js';
import type { DoctorProjectCommand } from './command.js';

export async function handleDoctorProject(_command: DoctorProjectCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Scanning workflow loop'));

  const { rootPath, statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `echo init` once to create Echo workflow metadata.');
    outro(chalk.yellow('Workflow loop needs attention.'));
    process.exitCode = 1;
    return;
  }

  const state = stateResult.state;
  const issues = diagnoseState({ rootPath, state });

  if (issues.length === 0) {
    log.success('Workflow loop is healthy. No drift detected.');
    log.info(`Echo version: ${state.echoVersion}`);
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

  log.info('Run `echo sync` to repair missing managed files, adopt new templates, or review template updates.');
  outro(chalk.yellow('Workflow loop needs attention.'));
  process.exitCode = 1;
}

function diagnoseState({ rootPath, state }: { rootPath: string; state: EchoState }): DoctorIssue[] {
  const issues: DoctorIssue[] = [];
  const manifest = readTemplateManifest();

  if (state.templateVersion !== manifest.templateVersion) {
    issues.push({
      severity: 'warning',
      message: `State was generated from template version ${state.templateVersion}; current template version is ${manifest.templateVersion}.`,
      hint: 'Run `echo sync` to review and apply or dismiss template updates.',
    });
  }

  addUnsupportedSelectionIssues(state, issues);
  const reportedMissingPaths = addExpectedTargetIssues(rootPath, state, issues);
  addManagedFileIssues(rootPath, state, issues, reportedMissingPaths);

  return issues;
}

function addUnsupportedSelectionIssues(state: EchoState, issues: DoctorIssue[]): void {
  for (const selectedAgent of state.selectedAgents) {
    if (!SUPPORTED_AGENTS.some((agent) => agent.id === selectedAgent)) {
      issues.push({ severity: 'warning', message: `State references unsupported agent: ${selectedAgent}.` });
    }
  }

  for (const selectedLanguageSkill of state.selectedLanguageSkills ?? []) {
    if (!SELECTABLE_LANGUAGE_SKILLS.some((skill) => skill.id === selectedLanguageSkill)) {
      issues.push({ severity: 'warning', message: `State references unsupported language skill: ${selectedLanguageSkill}.` });
    }
  }

  for (const reviewedLanguageSkill of state.reviewedLanguageSkills ?? []) {
    if (!SELECTABLE_LANGUAGE_SKILLS.some((skill) => skill.id === reviewedLanguageSkill)) {
      issues.push({ severity: 'warning', message: `State references unsupported reviewed language skill: ${reviewedLanguageSkill}.` });
    }
  }


  for (const selectedFrameworkSkill of state.selectedFrameworkSkills ?? []) {
    if (!SELECTABLE_FRAMEWORK_SKILLS.some((skill) => skill.id === selectedFrameworkSkill)) {
      issues.push({ severity: 'warning', message: `State references unsupported framework skill: ${selectedFrameworkSkill}.` });
    }
  }

  if (state.selectedArchitectureSkill && !SELECTABLE_ARCHITECTURE_SKILLS.some((skill) => skill.id === state.selectedArchitectureSkill)) {
    issues.push({ severity: 'warning', message: `State references unsupported architecture skill: ${state.selectedArchitectureSkill}.` });
  }

  for (const reviewedArchitectureSkill of state.reviewedArchitectureSkills ?? []) {
    if (!SELECTABLE_ARCHITECTURE_SKILLS.some((skill) => skill.id === reviewedArchitectureSkill)) {
      issues.push({ severity: 'warning', message: `State references unsupported reviewed architecture skill: ${reviewedArchitectureSkill}.` });
    }
  }
}

function addExpectedTargetIssues(rootPath: string, state: EchoState, issues: DoctorIssue[]): Set<string> {
  const reportedMissingPaths = new Set<string>();
  const expectedTargets = getWorkflowTargets(
    rootPath,
    getSelectedAgentsFromState(state),
    getSelectedLanguageSkillsFromState(state),
    getSelectedFrameworkSkillsFromState(state),
    getSelectedArchitectureSkillFromState(state)
  );

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
        hint: 'Run `echo sync` to recreate missing managed workflow files.',
      });
      continue;
    }

    if (!managedFile) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} exists but is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'Run `echo sync` to review and record this workflow file.',
      });
    }
  }

  return reportedMissingPaths;
}

function addManagedFileIssues(rootPath: string, state: EchoState, issues: DoctorIssue[], reportedMissingPaths: Set<string>): void {
  const manifest = readTemplateManifest();

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
          hint: 'Run `echo sync` to recreate missing managed workflow files.',
        });
      }
      continue;
    }

    const currentHash = sha256(fs.readFileSync(targetPath, 'utf8'));
    if (currentHash !== managedFile.sha256) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} has changed since Echo last recorded it.`,
        hint: 'If this was intentional, keep it. `echo sync` will not overwrite local edits automatically.',
      });
    }

    const currentTemplateVersion = getTemplateVersion(manifest, managedFile.template);
    if (managedFile.templateVersion !== currentTemplateVersion && !hasReviewedTemplateVersion(managedFile, currentTemplateVersion)) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} was generated from template version ${managedFile.templateVersion}; current template version is ${currentTemplateVersion}.`,
        hint: 'Run `echo sync` to review and apply or dismiss this template update.',
      });
    }
  }
}

function formatManagedFileStatusCounts(state: EchoState): string {
  const counts = Object.values(state.managedFiles).reduce<Record<ManagedFileStatus, number>>(
    (accumulator, managedFile) => {
      accumulator[managedFile.status ?? 'managed'] += 1;
      return accumulator;
    },
    { managed: 0, customized: 0, unmanaged: 0 }
  );

  return `managed=${counts.managed}, customized=${counts.customized}, unmanaged=${counts.unmanaged}`;
}
