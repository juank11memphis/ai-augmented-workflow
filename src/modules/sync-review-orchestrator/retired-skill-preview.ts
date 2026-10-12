import type { ManagedFileState, SibuState } from '../../shared/types.js';
import type { SkillRetirement } from '../template-catalog/retirements.js';
import type { RetiredSkillReviewCommand } from './retired-skill-review-command.js';
import type { RetiredSkillReviewPorts, RetiredSkillFileSnapshot } from './retired-skill-review-ports.js';
import type { RetiredSkillEffect, RetiredSkillReviewResult } from './retired-skill-review-result.js';

function selected(state: Readonly<SibuState>, skillId: string): boolean {
  return [state.selectedLanguageSkills, state.selectedFrameworkSkills, state.selectedDatabaseSkills,
    state.selectedWorkflowSkills].some((group) => group?.includes(skillId as never) ?? false);
}

function pathsForAgents(pathsByAgent: SkillRetirement['formerTargetsByAgent'], agents: readonly string[]): string[] {
  return [...new Set(agents.flatMap((agent) =>
    Object.hasOwn(pathsByAgent, agent) ? pathsByAgent[agent as keyof typeof pathsByAgent] : []))];
}

function classifyRecordedFile(record: ManagedFileState | undefined, snapshot: RetiredSkillFileSnapshot):
  'unchanged' | 'edited' | 'unmanaged' | 'uncertain' {
  if (snapshot.status !== 'present') return 'uncertain';
  if (!record) return 'unmanaged';
  if (record.status === 'unmanaged') return 'unmanaged';
  if (record.status === 'customized') return 'edited';
  if (!record.sha256) return 'uncertain';
  return snapshot.sha256 === record.sha256 ? 'unchanged' : 'edited';
}

export function previewRetiredSkill(command: RetiredSkillReviewCommand, ports: RetiredSkillReviewPorts): RetiredSkillReviewResult {
  const identity = ports.catalog.resolveSkill(command.skillId);
  if (identity.status !== 'retired') return { status: 'not-retired', skillId: command.skillId };
  const retirement = identity.retirement;
  const state = ports.state.read();
  const remove: RetiredSkillEffect[] = [];
  const keepAsOwn: RetiredSkillEffect[] = [];
  const removeFromSibuGuidance: RetiredSkillEffect[] = [];
  const reviewYourself: RetiredSkillEffect[] = [];
  const uncertain: RetiredSkillEffect[] = [];

  for (const path of pathsForAgents(retirement.formerTargetsByAgent, state.selectedAgents)) {
    const record = state.managedFiles[path];
    const snapshot = ports.files.inspect(path, command.skillId);
    if (snapshot.status === 'missing' && !record) continue;
    const ownership = record?.template === retirement.formerTemplateRelativePath
      ? classifyRecordedFile(record, snapshot) : snapshot.status === 'present' ? 'unmanaged' : 'uncertain';
    if (ownership === 'unchanged') remove.push({ path, reason: 'Unchanged Sibu-managed copy' });
    if (ownership === 'edited') keepAsOwn.push({ path, reason: 'Edited or customized copy remains intact and becomes unmanaged' });
    if (ownership === 'unmanaged') reviewYourself.push({ path, reason: 'User-owned or already unmanaged copy' });
    if (ownership === 'uncertain') uncertain.push({ path, reason: 'Current copy or ownership cannot be verified' });
  }

  for (const path of pathsForAgents(retirement.generatedRoutingTargetsByAgent, state.selectedAgents)) {
    const snapshot = ports.files.inspect(path, command.skillId);
    if (snapshot.status === 'missing') {
      if (state.managedFiles[path]) uncertain.push({ path, reason: 'Recorded routing file is missing' });
      continue;
    }
    if (snapshot.status !== 'present') {
      uncertain.push({ path, reason: 'Routing path cannot be inspected safely' });
      continue;
    }
    if (!snapshot.referencesSkill) continue;
    const ownership = classifyRecordedFile(state.managedFiles[path], snapshot);
    if (ownership === 'unchanged') removeFromSibuGuidance.push({ path, reason: 'Refresh unchanged Sibu-managed routing' });
    if (ownership === 'edited') {
      keepAsOwn.push({ path, reason: 'Edited routing file remains intact and becomes unmanaged' });
      reviewYourself.push({ path, reason: 'Retired-skill reference remains in edited routing' });
    }
    if (ownership === 'unmanaged') reviewYourself.push({ path, reason: 'Retired-skill reference in user-owned routing' });
    if (ownership === 'uncertain') uncertain.push({ path, reason: 'Routing ownership cannot be verified' });
  }

  for (const reference of ports.files.userReferences(command.skillId)) {
    if (!reviewYourself.some((effect) => effect.path === reference.path)) {
      reviewYourself.push({ path: reference.path, reason: reference.description });
    }
  }
  return { status: 'preview', skillId: command.skillId, explanation: retirement.explanation,
    selected: selected(state, command.skillId), choices: ['keep', 'clean-up', 'cancel'],
    remove, keepAsOwn, removeFromSibuGuidance, reviewYourself, uncertain, canCleanUp: uncertain.length === 0 };
}
