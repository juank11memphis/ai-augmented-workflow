import type { ManagedFileState, SibuState } from '../../shared/types.js';
import { sha256 } from '../../shared/hash.js';
import type { SkillRetirement } from '../template-catalog/retirements.js';
import { previewRetiredSkill } from './retired-skill-preview.js';
import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import type { RetiredSkillFileSnapshot, RetiredSkillReviewPorts } from './retired-skill-review-ports.js';
import type { RetiredSkillReviewResult } from './retired-skill-review-result.js';

type Preview = Extract<RetiredSkillReviewResult, { status: 'preview' }>;
type StateSnapshot = { bytes: string; state: SibuState };
type EffectKind = 'removed' | 'unmanaged' | 'routing-refreshed' | 'selection-removed';

export type RetiredSkillAppliedEffect = Readonly<{ kind: EffectKind; path: string }>;
export type RetiredSkillApplyResult = Readonly<{
  status: 'completed' | 'deferred' | 'cancelled' | 'blocked' | 'stale' | 'partial' | 'not-retired';
  skillId: string;
  effects: readonly RetiredSkillAppliedEffect[];
  remainingManualReview: readonly string[];
  reason?: string;
}>;

export type RetiredSkillApplyPorts = Readonly<{
  review: RetiredSkillReviewPorts;
  retirements(): readonly SkillRetirement[];
  state: {
    snapshot(): StateSnapshot;
    checkpoint(expectedBytes: string, nextState: SibuState): 'saved' | 'stale';
  };
  files: {
    inspect(path: string, skillId: string): RetiredSkillFileSnapshot;
    read(path: string): string;
    removeIfHash(path: string, sha256: string): boolean;
    writeIfHash(path: string, sha256: string, contents: string): boolean;
    renderRouting(path: string, state: SibuState, previous: string, removedId: string, retainedIds: readonly string[]):
      { contents: string; templateVersion: string } | undefined;
  };
}>;

function samePreview(actual: Preview, offered: Preview): boolean {
  return JSON.stringify(actual) === JSON.stringify(offered);
}

function selectedGroups(state: SibuState): Array<keyof Pick<SibuState,
  'selectedLanguageSkills' | 'selectedFrameworkSkills' | 'selectedDatabaseSkills' | 'selectedWorkflowSkills'>> {
  return ['selectedLanguageSkills', 'selectedFrameworkSkills', 'selectedDatabaseSkills', 'selectedWorkflowSkills'];
}

function removeSelection(state: SibuState, skillId: string): boolean {
  let removed = false;
  for (const key of selectedGroups(state)) {
    const selected = state[key];
    if (!selected?.includes(skillId as never)) continue;
    state[key] = selected.filter((id) => id !== skillId) as never;
    removed = true;
  }
  return removed;
}

function sameSnapshot(left: RetiredSkillFileSnapshot, right: RetiredSkillFileSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function preserveRetiredGuidance(previous: string, candidate: string, retainedIds: readonly string[]): boolean {
  for (const id of retainedIds) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reference = new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, 'i');
    for (const line of previous.split('\n').filter((item) => reference.test(item))) {
      if (!line.startsWith('- ') || !candidate.split('\n').includes(line)) return false;
    }
  }
  return true;
}

function removesManagedGuidance(previous: string, candidate: string, removedId: string): boolean {
  const escaped = removedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reference = new RegExp(`(^|[^a-z0-9-])${escaped}([^a-z0-9-]|$)`, 'i');
  return previous.split('\n').filter((line) => line.startsWith('- ') && reference.test(line))
    .every((line) => !candidate.split('\n').includes(line));
}

export function applyRetiredSkillReview(
  offered: Preview, choice: RetiredSkillReviewChoice, ports: RetiredSkillApplyPorts
): RetiredSkillApplyResult {
  const effects: RetiredSkillAppliedEffect[] = [];
  const base = { skillId: offered.skillId, effects, remainingManualReview: offered.reviewYourself.map((item) => item.path) };
  if (choice === 'keep') return { ...base, status: 'deferred' };
  if (choice === 'cancel') return { ...base, status: 'cancelled' };
  if (!offered.canCleanUp) return { ...base, status: 'blocked', reason: 'Preview contains uncertain ownership.' };
  const identity = ports.review.catalog.resolveSkill(offered.skillId);
  if (identity.status !== 'retired') return { ...base, status: 'not-retired' };
  if (identity.retirement.category === 'mandatory' && offered.selected) {
    return { ...base, status: 'blocked', reason: 'Mandatory retirement has an unexpected selection.' };
  }
  const initial = ports.state.snapshot();
  if (sha256(JSON.stringify(initial.state)) !== offered.stateFingerprint) {
    return { ...base, status: 'stale', reason: 'Workflow state changed since review.' };
  }
  const actual = previewRetiredSkill({ type: 'preview-retired-skill', skillId: offered.skillId }, ports.review);
  if (actual.status !== 'preview' || !samePreview(actual, offered)) {
    return { ...base, status: 'stale', reason: 'The reviewed effects changed.' };
  }

  const paths = [...new Set([...offered.remove, ...offered.keepAsOwn, ...offered.removeFromSibuGuidance]
    .map((item) => item.path))];
  const observed = new Map(paths.map((path) => [path, ports.files.inspect(path, offered.skillId)]));
  if (paths.some((path) => !sameSnapshot(observed.get(path)!, offered.observedFiles[path]!))) {
    return { ...base, status: 'stale', reason: 'File evidence changed before cleanup.' };
  }
  for (const item of offered.removeFromSibuGuidance) {
    try {
      const previous = ports.files.read(item.path);
      const retainedIds = ports.retirements().filter((retirement) => retirement.id !== offered.skillId)
        .map((retirement) => retirement.id);
      const renderState = structuredClone(initial.state);
      removeSelection(renderState, offered.skillId);
      const candidate = ports.files.renderRouting(item.path, renderState, previous, offered.skillId, retainedIds);
      if (!candidate || !preserveRetiredGuidance(previous, candidate.contents, retainedIds) ||
          !removesManagedGuidance(previous, candidate.contents, offered.skillId)) {
        return { ...base, status: 'blocked', reason: 'Shared routing cannot preserve other retired guidance; fresh review required.' };
      }
    } catch {
      return { ...base, status: 'blocked', reason: 'Routing cannot be rendered safely; fresh review required.' };
    }
  }
  let current = initial;
  let unverifiedFileEffect = false;
  const stop = (reason: string): RetiredSkillApplyResult => ({ ...base,
    status: effects.length || unverifiedFileEffect ? 'partial' : 'stale', reason });
  const recheck = (path?: string): boolean => {
    const state = ports.state.snapshot();
    if (state.bytes !== current.bytes) return false;
    return path === undefined || sameSnapshot(observed.get(path)!, ports.files.inspect(path, offered.skillId));
  };
  const checkpoint = (nextState: SibuState, effect?: RetiredSkillAppliedEffect): boolean => {
    nextState.updatedAt = new Date().toISOString();
    const outcome = ports.state.checkpoint(current.bytes, nextState);
    if (outcome !== 'saved') return false;
    current = ports.state.snapshot();
    if (effect) effects.push(effect);
    return true;
  };

  try {
    for (const item of offered.keepAsOwn) {
      if (!recheck(item.path)) return stop('File or state changed before ownership transition.');
      const record = current.state.managedFiles[item.path];
      if (!record || record.status === 'unmanaged') continue;
      const nextState = structuredClone(current.state);
      nextState.managedFiles[item.path] = { ...record, status: 'unmanaged', reason: 'retired skill preserved' };
      if (!checkpoint(nextState, { kind: 'unmanaged', path: item.path })) return stop('State checkpoint failed.');
    }
    for (const item of offered.remove) {
      if (!recheck(item.path)) return stop('File or state changed before removal.');
      const record: ManagedFileState | undefined = current.state.managedFiles[item.path];
      unverifiedFileEffect = true;
      if (!record || record.status === 'customized' || record.status === 'unmanaged' || !record.sha256 ||
          !ports.files.removeIfHash(item.path, record.sha256)) {
        unverifiedFileEffect = false;
        return stop('Managed copy could not be removed safely.');
      }
      if (ports.files.inspect(item.path, offered.skillId).status !== 'missing') {
        return stop('Removed copy could not be verified.');
      }
      effects.push({ kind: 'removed', path: item.path });
      unverifiedFileEffect = false;
      const nextState = structuredClone(current.state);
      delete nextState.managedFiles[item.path];
      if (!checkpoint(nextState)) return stop('State checkpoint failed after removal.');
    }
    for (const item of offered.removeFromSibuGuidance) {
      if (!recheck(item.path)) return stop('File or state changed before routing refresh.');
      const record = current.state.managedFiles[item.path];
      if (!record || record.status === 'customized' || record.status === 'unmanaged' || !record.sha256) {
        return stop('Routing ownership changed.');
      }
      const previous = ports.files.read(item.path);
      const retainedIds = ports.retirements().filter((retirement) => retirement.id !== offered.skillId)
        .map((retirement) => retirement.id);
      const nextState = structuredClone(current.state);
      const renderState = structuredClone(nextState);
      removeSelection(renderState, offered.skillId);
      const rendered = ports.files.renderRouting(item.path, renderState, previous, offered.skillId, retainedIds);
      if (rendered === undefined || !preserveRetiredGuidance(previous, rendered.contents, retainedIds) ||
          !removesManagedGuidance(previous, rendered.contents, offered.skillId)) {
        return { ...base, status: effects.length ? 'partial' : 'blocked', reason: 'Shared routing cannot preserve other retired guidance; fresh review required.' };
      }
      unverifiedFileEffect = true;
      if (!ports.files.writeIfHash(item.path, record.sha256, rendered.contents)) {
        unverifiedFileEffect = false;
        return stop('Routing changed before write.');
      }
      const written = ports.files.inspect(item.path, offered.skillId);
      if (written.status !== 'present' || written.sha256 !== sha256(rendered.contents)) {
        return stop('Refreshed routing could not be verified.');
      }
      effects.push({ kind: 'routing-refreshed', path: item.path });
      unverifiedFileEffect = false;
      nextState.managedFiles[item.path] = { ...record, templateVersion: rendered.templateVersion,
        sha256: written.sha256, status: 'managed' };
      if (!checkpoint(nextState)) {
        return stop('State checkpoint failed after routing refresh.');
      }
    }
    if (!recheck()) return stop('State changed before selection removal.');
    const nextState = structuredClone(current.state);
    if (removeSelection(nextState, offered.skillId)) {
      if (!checkpoint(nextState, { kind: 'selection-removed', path: '.sibu/state.json' })) {
        return stop('State checkpoint failed before selection removal.');
      }
    }
    return { ...base, status: 'completed' };
  } catch {
    return { ...base, status: effects.length || unverifiedFileEffect ? 'partial' : 'blocked', reason: 'Cleanup effect or checkpoint failed.' };
  }
}
