import fs from 'node:fs';
import path from 'node:path';
import { log, select, isCancel } from '@clack/prompts';

import type { SibuState } from '../../shared/types.js';
import { inspectWorkflow, type InspectWorkflowResult } from '../workflow-health-inspector/index.js';
import { loadSkillRetirements, lookupSkillIdentity, type SkillRetirement } from '../template-catalog/index.js';
import { createRetiredSkillFileAdapter } from './retired-skill-file-adapter.js';
import { applyRetiredSkillReview } from './retired-skill-review-handler.js';
import { previewRetiredSkill } from './retired-skill-preview.js';
import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import type { RetiredSkillReviewResult } from './retired-skill-review-result.js';

type Preview = Extract<RetiredSkillReviewResult, { status: 'preview' }>;
type Interaction = {
  summary(skills: readonly string[]): void;
  choose(preview: Preview): Promise<RetiredSkillReviewChoice>;
  outcome(message: string): void;
};
type ReviewDependencies = {
  retirements(): readonly SkillRetirement[];
  inspect(state: SibuState, rootPath: string, retirements: readonly SkillRetirement[]): InspectWorkflowResult;
  createFiles: typeof createRetiredSkillFileAdapter;
  interaction: Interaction;
};
export type RetiredSkillSyncReview = { status: 'ready' | 'stopped'; protectedPaths: ReadonlySet<string> };

function inspectProject(state: SibuState, rootPath: string, retirements: readonly SkillRetirement[]): InspectWorkflowResult {
  return inspectWorkflow({ type: 'inspect-workflow' }, state, {
    resolveSkill: (id) => lookupSkillIdentity(id, retirements),
    retirements: () => retirements,
    exists: (relativePath) => fs.existsSync(path.join(rootPath, relativePath)),
    readText: (relativePath) => fs.readFileSync(path.join(rootPath, relativePath), 'utf8'),
  });
}

const defaultInteraction: Interaction = {
  summary: (skills) => log.warn(`Retired skills awaiting review: ${skills.join(', ')}.`),
  choose: async (preview) => {
    log.info(`${preview.skillId}: ${preview.explanation}`);
    for (const [label, effects] of [
      ['Remove managed copy', preview.remove], ['Keep as your own', preview.keepAsOwn],
      ['Refresh Sibu routing', preview.removeFromSibuGuidance], ['Review yourself', preview.reviewYourself],
      ['Uncertain ownership', preview.uncertain],
    ] as const) {
      for (const effect of effects) log.info(`${label}: ${effect.path} — ${effect.reason}`);
    }
    const choice = await select<RetiredSkillReviewChoice>({
      message: `What should Sibu do with ${preview.skillId}?`,
      initialValue: 'keep',
      options: [
        { value: 'keep', label: 'Keep for now' },
        { value: 'clean-up', label: 'Clean up', hint: preview.canCleanUp ? 'Apply only verified effects.' : 'Unavailable until ownership is clear.' },
        { value: 'cancel', label: 'Cancel sync' },
      ],
    });
    return isCancel(choice) ? 'cancel' : choice;
  },
  outcome: (message) => log.info(message),
};

function protection(findings: InspectWorkflowResult, retirements: readonly SkillRetirement[]): ReadonlySet<string> {
  const paths = new Set<string>();
  for (const finding of findings.findings) {
    if (finding.kind !== 'retired-skill') continue;
    const retirement = retirements.find((item) => item.id === finding.skillId);
    if (!retirement) continue;
    for (const agent of Object.keys(retirement.formerTargetsByAgent) as Array<keyof SkillRetirement['formerTargetsByAgent']>) {
      for (const target of retirement.formerTargetsByAgent[agent]) paths.add(target);
    }
    for (const item of finding.evidence.filter((item) => item.source === 'generated-routing')) paths.add(item.path);
  }
  return paths;
}

export async function reviewRetiredSkills(rootPath: string, statePath: string,
  overrides: Partial<ReviewDependencies> = {}): Promise<RetiredSkillSyncReview> {
  const dependencies = { retirements: loadSkillRetirements, inspect: inspectProject, createFiles: createRetiredSkillFileAdapter,
    interaction: defaultInteraction, ...overrides };
  const retirements = dependencies.retirements();
  const files = dependencies.createFiles(rootPath, statePath);
  const findings = () => dependencies.inspect(files.state.snapshot().state, rootPath, retirements);
  let current = findings();
  const pending = current.findings.filter((finding) => finding.kind === 'retired-skill').map((finding) => finding.skillId);
  if (pending.length) dependencies.interaction.summary(pending);

  for (const skillId of pending) {
    current = findings();
    if (!current.findings.some((finding) => finding.kind === 'retired-skill' && finding.skillId === skillId)) continue;
    const review = {
      catalog: { resolveSkill: (id: string) => lookupSkillIdentity(id, retirements) },
      state: { read: () => files.state.snapshot().state },
      files: { inspect: files.files.inspect, userReferences: (_id: string) => [] },
      interaction: { choose: dependencies.interaction.choose },
    };
    const preview = previewRetiredSkill({ type: 'preview-retired-skill', skillId }, review);
    if (preview.status !== 'preview') return { status: 'stopped', protectedPaths: protection(current, retirements) };
    const choice = await dependencies.interaction.choose(preview);
    const result = applyRetiredSkillReview(preview, choice,
      { review, retirements: () => retirements, ...files });
    dependencies.interaction.outcome(`${skillId}: ${result.status}${result.reason ? ` — ${result.reason}` : ''}.`);
    for (const path of result.remainingManualReview) dependencies.interaction.outcome(`Review yourself: ${path}`);
    if (result.status === 'completed') {
      dependencies.interaction.outcome('User-written references were not changed; review any that remain.');
    }
    if (result.status === 'cancelled' || !['completed', 'deferred'].includes(result.status)) {
      return { status: 'stopped', protectedPaths: protection(findings(), retirements) };
    }
  }
  return { status: 'ready', protectedPaths: protection(findings(), retirements) };
}
