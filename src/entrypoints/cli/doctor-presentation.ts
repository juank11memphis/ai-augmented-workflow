import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';

import { getProjectContext } from '../../shared/paths.js';
import type { DoctorIssue } from '../../shared/types.js';
import { diagnoseState, formatManagedFileStatusCounts, getDoctorSyncNextStepLines } from '../../modules/workflow-health-inspector/index.js';
import { readStateForDoctor } from '../../modules/workflow-state-ledger/index.js';
import { checkForLatestSibuVersion, getNpmVersionAdvisoryLines } from '../../support/version-advisory/index.js';
import { renderIntro } from '../../support/interactive-guidance/index.js';

export function renderRetirementFinding(issue: DoctorIssue, width = process.stdout.columns ?? 80): string[] {
  const retirement = issue.retirement;
  if (!retirement) return [issue.message, ...(issue.hint ? [issue.hint] : [])];
  if (retirement.kind === 'unrecognized') return [
    `Unrecognized skill: ${retirement.skillId}`,
    'Sibu cannot confirm whether this skill is current or retired.',
    'It will not be offered for retired-skill cleanup.',
  ];
  const explanation = retirement.explanation ?? '';
  if (width < 80) return [
    `Retired skill: ${retirement.skillId}`,
    explanation,
    '',
    'Run `sibu sync` to review cleanup.',
    'Doctor changed nothing.',
  ];
  return [
    `Retired skill: ${retirement.skillId} — ${explanation}`,
    'Installed in this project; cleanup requires your choice.',
    '',
    'Run `sibu sync` to review cleanup. Doctor changed nothing.',
  ];
}

export async function handleDoctorProject(): Promise<void> {
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
  const advisory = await checkForLatestSibuVersion();
  if (issues.length === 0) {
    log.success('Workflow is healthy. No drift detected.');
    log.info(`Sibu version: ${state.sibuVersion}`);
    log.info(`Template version: ${state.templateVersion}`);
    log.info(`Managed workflow files: ${Object.keys(state.managedFiles).length}`);
    log.info(`File statuses: ${formatManagedFileStatusCounts(state)}`);
    for (const line of getNpmVersionAdvisoryLines(advisory)) log.info(line);
    outro(chalk.green('Check complete.'));
    return;
  }

  log.warn('Workflow review needed');
  for (const issue of issues) {
    if (issue.retirement) {
      for (const line of renderRetirementFinding(issue)) log.info(line);
    } else {
      if (issue.severity === 'error') log.error(issue.message);
      else log.warn(issue.message);
      if (issue.hint) log.info(issue.hint);
    }
  }
  for (const line of getNpmVersionAdvisoryLines(advisory)) log.info(line);
  if (issues.some((issue) => !issue.retirement)) {
    for (const line of getDoctorSyncNextStepLines()) log.info(line);
  }
  outro(chalk.yellow('Review needed.'));
  process.exitCode = 1;
}
