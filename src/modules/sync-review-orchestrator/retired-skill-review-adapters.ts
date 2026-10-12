import fs from 'node:fs';
import path from 'node:path';
import { log } from '@clack/prompts';

import type { SibuState } from '../../shared/types.js';
import { inspectWorkflow, type InspectWorkflowResult } from '../workflow-health-inspector/index.js';
import { loadSkillRetirements, lookupSkillIdentity, type SkillRetirement } from '../template-catalog/index.js';
import { createRetiredSkillFileAdapter } from './retired-skill-file-adapter.js';
import { applyRetiredSkillReview } from './retired-skill-review-handler.js';
import { previewRetiredSkill } from './retired-skill-preview.js';
import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import type { RetiredSkillReviewResult } from './retired-skill-review-result.js';
import type { RetiredSkillApplyResult } from './retired-skill-review-handler.js';
import { askForRetiredSkillChoice, renderRetiredSkillOutcome, renderRetiredSkillSummary } from './retired-skill-review-prompt.js';

type Preview = Extract<RetiredSkillReviewResult, { status: 'preview' }>;
type Interaction = {
  summary(skills: readonly string[], retirements?: readonly SkillRetirement[]): void;
  choose(preview: Preview, index?: number, total?: number): Promise<RetiredSkillReviewChoice>;
  outcome(result: RetiredSkillApplyResult): void;
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
  summary: (skills, retirements = []) => { for (const line of renderRetiredSkillSummary(skills, retirements)) log.info(line); },
  choose: askForRetiredSkillChoice,
  outcome: (result) => { for (const line of renderRetiredSkillOutcome(result)) log.info(line); },
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

function userReferences(rootPath: string, state: SibuState, skillId: string,
  inspect: ReturnType<typeof createRetiredSkillFileAdapter>['files']['inspect']): Array<{ path: string; description: string }> {
  const candidates = ['README.md', 'AGENTS.md', 'GEMINI.md', 'CLAUDE.md'];
  return candidates.filter((relativePath) => {
    const record = state.managedFiles[relativePath];
    if (record && record.status !== 'unmanaged') return false;
    if (!fs.existsSync(path.join(rootPath, relativePath))) return false;
    const snapshot = inspect(relativePath, skillId);
    return snapshot.status === 'present' && snapshot.referencesSkill;
  }).map((relativePath) => ({ path: relativePath, description: 'User-written reference remains for review' }));
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
  if (pending.length) dependencies.interaction.summary(pending, retirements);

  for (const [index, skillId] of pending.entries()) {
    current = findings();
    if (!current.findings.some((finding) => finding.kind === 'retired-skill' && finding.skillId === skillId)) continue;
    const review = {
      catalog: { resolveSkill: (id: string) => lookupSkillIdentity(id, retirements) },
      state: { read: () => files.state.snapshot().state },
      files: { inspect: files.files.inspect, userReferences: (id: string) =>
        userReferences(rootPath, files.state.snapshot().state, id, files.files.inspect) },
      interaction: { choose: dependencies.interaction.choose },
    };
    const preview = previewRetiredSkill({ type: 'preview-retired-skill', skillId }, review);
    if (preview.status !== 'preview') return { status: 'stopped', protectedPaths: protection(current, retirements) };
    const choice = await dependencies.interaction.choose(preview, index + 1, pending.length);
    const result = applyRetiredSkillReview(preview, choice,
      { review, retirements: () => retirements, ...files });
    dependencies.interaction.outcome(result);
    if (result.status === 'cancelled' || !['completed', 'deferred'].includes(result.status)) {
      return { status: 'stopped', protectedPaths: protection(findings(), retirements) };
    }
  }
  return { status: 'ready', protectedPaths: protection(findings(), retirements) };
}
