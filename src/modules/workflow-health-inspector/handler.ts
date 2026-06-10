import fs from 'node:fs';
import path from 'node:path';

import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { STATE_RELATIVE_PATH } from '../../shared/catalog.js';
import { SELECTABLE_ARCHITECTURE_SKILLS, SELECTABLE_DATABASE_SKILLS, SELECTABLE_FRAMEWORK_SKILLS, SELECTABLE_LANGUAGE_SKILLS, SELECTABLE_MCP_SERVERS, SUPPORTED_AGENTS } from '../template-catalog/index.js';
import { sha256 } from '../../shared/hash.js';
import { checkForLatestSibuVersion } from '../../support/version-advisory/index.js';
import { getProjectContext } from '../../shared/paths.js';
import { renderIntro } from '../../support/interactive-guidance/index.js';
import { hasReviewedTemplateVersion, readStateForDoctor } from '../workflow-state-ledger/index.js';
import { getTemplateVersion, readTemplateManifest } from '../template-catalog/index.js';
import type { DoctorIssue, ManagedFileStatus, NpmVersionCheckResult, SibuState } from '../../shared/types.js';
import {
  getSelectedAgentsFromState,
  getSelectedArchitectureSkillFromState,
  getSelectedDatabaseSkillsFromState,
  getSelectedFrameworkSkillsFromState,
  getSelectedLanguageSkillsFromState,
  getSelectedMcpServersFromState,
  getSelectedWorkflowSkillsFromState,
  getWorkflowTargets,
} from '../template-catalog/index.js';
import type { DoctorProjectCommand } from './command.js';

export async function handleDoctorProject(_command: DoctorProjectCommand): Promise<void> {
  await renderIntro();
  intro(chalk.cyan('Checking workflow state'));

  const { rootPath, statePath } = getProjectContext();
  const stateResult = readStateForDoctor(statePath);

  if (!stateResult.ok) {
    log.error(stateResult.message);
    log.info('Run `sibu init` once to create Sibu workflow metadata.');
    outro(chalk.yellow('Setup needs attention.'));
    process.exitCode = 1;
    return;
  }

  const state = stateResult.state;
  const issues = diagnoseState({ rootPath, state });
  const npmVersionResult = await checkForLatestSibuVersion();

  if (issues.length === 0) {
    log.success('Workflow is healthy. No drift detected.');
    log.info(`Sibu version: ${state.sibuVersion}`);
    log.info(`Template version: ${state.templateVersion}`);
    log.info(`Managed workflow files: ${Object.keys(state.managedFiles).length}`);
    log.info(`File statuses: ${formatManagedFileStatusCounts(state)}`);
    logNpmVersionAdvisory(npmVersionResult);
    outro(chalk.green('Check complete.'));
    return;
  }

  log.warn('Found workflow changes that need review.');
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

  logNpmVersionAdvisory(npmVersionResult);
  logSyncNextStep();
  outro(chalk.yellow('Review needed.'));
  process.exitCode = 1;
}

export function getNpmVersionAdvisoryLines(result: NpmVersionCheckResult): string[] {
  if (result.status !== 'update-available') {
    return [];
  }

  return [
    `A newer Sibu version is available: ${result.latestVersion} (${result.currentVersion} installed).`,
    'Update with `npm install -g @juancr11/sibu`.',
  ];
}

export function getDoctorSyncNextStepLines(): string[] {
  return [
    'Run `sibu sync` to review these workflow changes and choose whether to apply them.',
    'Sibu will not change project files until you explicitly run `sibu sync`.',
  ];
}

function logNpmVersionAdvisory(result: NpmVersionCheckResult): void {
  for (const line of getNpmVersionAdvisoryLines(result)) {
    log.info(line);
  }
}

function logSyncNextStep(): void {
  for (const line of getDoctorSyncNextStepLines()) {
    log.info(line);
  }
}

export function diagnoseState({ rootPath, state }: { rootPath: string; state: SibuState }): DoctorIssue[] {
  const issues: DoctorIssue[] = [];
  const manifest = readTemplateManifest();

  if (state.templateVersion !== manifest.templateVersion) {
    issues.push({
      severity: 'warning',
      message: `State was generated from template version ${state.templateVersion}; current template version is ${manifest.templateVersion}.`,
      hint: 'Run `sibu sync` to review and apply or dismiss template updates.',
    });
  }

  addUnsupportedSelectionIssues(state, issues);
  const reportedMissingPaths = addExpectedTargetIssues(rootPath, state, issues);
  addManagedFileIssues(rootPath, state, issues, reportedMissingPaths);

  return issues;
}

function addUnsupportedSelectionIssues(state: SibuState, issues: DoctorIssue[]): void {
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

  for (const selectedDatabaseSkill of state.selectedDatabaseSkills ?? []) {
    if (!SELECTABLE_DATABASE_SKILLS.some((skill) => skill.id === selectedDatabaseSkill)) {
      issues.push({ severity: 'warning', message: `State references unsupported database skill: ${selectedDatabaseSkill}.` });
    }
  }

  for (const selectedMcpServer of state.selectedMcpServers ?? []) {
    if (!SELECTABLE_MCP_SERVERS.some((server) => server.id === selectedMcpServer)) {
      issues.push({ severity: 'warning', message: `State references unsupported MCP server: ${selectedMcpServer}.` });
    }
  }

  for (const reviewedArchitectureSkill of state.reviewedArchitectureSkills ?? []) {
    if (!SELECTABLE_ARCHITECTURE_SKILLS.some((skill) => skill.id === reviewedArchitectureSkill)) {
      issues.push({ severity: 'warning', message: `State references unsupported reviewed architecture skill: ${reviewedArchitectureSkill}.` });
    }
  }
}

function addExpectedTargetIssues(rootPath: string, state: SibuState, issues: DoctorIssue[]): Set<string> {
  const reportedMissingPaths = new Set<string>();
  const expectedTargets = getWorkflowTargets(
    rootPath,
    getSelectedAgentsFromState(state),
    getSelectedLanguageSkillsFromState(state),
    getSelectedFrameworkSkillsFromState(state),
    getSelectedArchitectureSkillFromState(state),
    getSelectedWorkflowSkillsFromState(state),
    getSelectedDatabaseSkillsFromState(state),
    getSelectedMcpServersFromState(state)
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
        hint: 'Run `sibu sync` to recreate missing managed workflow files.',
      });
      continue;
    }

    if (!managedFile) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} exists but is not recorded in ${STATE_RELATIVE_PATH}.`,
        hint: 'Run `sibu sync` to review and record this workflow file.',
      });
    }
  }

  return reportedMissingPaths;
}

function addManagedFileIssues(rootPath: string, state: SibuState, issues: DoctorIssue[], reportedMissingPaths: Set<string>): void {
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
          hint: 'Run `sibu sync` to recreate missing managed workflow files.',
        });
      }
      continue;
    }

    const currentHash = sha256(fs.readFileSync(targetPath, 'utf8'));
    if (currentHash !== managedFile.sha256) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} has changed since Sibu last recorded it.`,
        hint: 'If this was intentional, keep it. `sibu sync` will not overwrite local edits automatically.',
      });
    }

    const currentTemplateVersion = getTemplateVersion(manifest, managedFile.template);
    if (managedFile.templateVersion !== currentTemplateVersion && !hasReviewedTemplateVersion(managedFile, currentTemplateVersion)) {
      issues.push({
        severity: 'warning',
        message: `${relativePath} was generated from template version ${managedFile.templateVersion}; current template version is ${currentTemplateVersion}.`,
        hint: 'Run `sibu sync` to review and apply or dismiss this template update.',
      });
    }
  }
}

function formatManagedFileStatusCounts(state: SibuState): string {
  const counts = Object.values(state.managedFiles).reduce<Record<ManagedFileStatus, number>>(
    (accumulator, managedFile) => {
      accumulator[managedFile.status ?? 'managed'] += 1;
      return accumulator;
    },
    { managed: 0, customized: 0, unmanaged: 0 }
  );

  return `managed=${counts.managed}, customized=${counts.customized}, unmanaged=${counts.unmanaged}`;
}
