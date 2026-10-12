import { isCancel, log, select } from '@clack/prompts';

import type { SkillRetirement } from '../template-catalog/index.js';
import type { RetiredSkillReviewChoice } from './retired-skill-review-command.js';
import type { RetiredSkillReviewResult } from './retired-skill-review-result.js';
import type { RetiredSkillApplyResult } from './retired-skill-review-handler.js';

type Preview = Extract<RetiredSkillReviewResult, { status: 'preview' }>;
type Selector = typeof select<RetiredSkillReviewChoice>;

export function renderRetiredSkillSummary(ids: readonly string[], records: readonly SkillRetirement[], width = process.stdout.columns ?? 80): string[] {
  if (!ids.length) return [];
  const lines = [`Retired skills need review: ${ids.length}`];
  if (ids.length > 1) {
    lines.push('');
    for (const [index, id] of ids.entries()) {
      const kind = records.find((record) => record.id === id)?.category === 'mandatory'
        ? 'formerly mandatory skill' : 'installed skill';
      lines.push(width < 80 ? `${index + 1}. ${id}` : `  ${id.padEnd(Math.max(24, ...ids.map((item) => item.length + 2)))} ${kind}`);
    }
  }
  lines.push('', width < 80 && ids.length > 1
    ? 'Review each skill separately. Nothing is removed\nwithout your choice.'
    : 'Review each skill separately. Nothing is removed without your choice.');
  return lines;
}

export function renderRetiredSkillPreview(preview: Preview, width = process.stdout.columns ?? 80, index = 1, total = 1): string[] {
  const compact = width < 80;
  const lines = total > 1 ? [`Skill ${index} of ${total}`, ''] : [];
  lines.push(compact ? `${preview.skillId} was retired` : `${preview.skillId} was retired — ${preview.explanation}`);
  if (compact) lines.push(preview.explanation);
  lines.push('', 'Clean up would:');
  const groups = [
    ['Remove unchanged copy', preview.remove],
    ['Keep your edited copy as your own', preview.keepAsOwn],
    ['Remove from Sibu guidance', preview.removeFromSibuGuidance],
    ['Leave for your review', preview.reviewYourself],
    ['Cannot verify safely', preview.uncertain],
  ] as const;
  for (const [label, effects] of groups) {
    for (const effect of effects) {
      if (compact) lines.push(`  ${label}:`, `    ${effect.path}`);
      else lines.push(`  ${label.padEnd(30)} ${effect.path}`);
    }
  }
  if (preview.selected && !preview.removeFromSibuGuidance.length) lines.push('  Remove recorded Sibu selection');
  if (!preview.canCleanUp) lines.push('Cleanup cannot safely complete until ownership is clear.');
  return lines;
}

export function renderRetiredSkillOutcome(result: RetiredSkillApplyResult): string[] {
  const id = result.skillId;
  if (result.status === 'deferred') return [`${id}: kept for now. Doctor will keep flagging it.`];
  if (result.status === 'cancelled') return [`${id}: review cancelled. Nothing was cleaned up.`];
  if (result.status !== 'completed') {
    const lines = [`${id}: not cleaned up.`];
    if (result.effects.length) lines.push(`Completed before stopping: ${result.effects.map((effect) => `${effect.kind} ${effect.path}`).join(', ')}`);
    lines.push(result.reason ?? 'Cleanup could not safely complete.', 'Run sync again to review its current contents.');
    return lines;
  }
  const count = (kind: string) => result.effects.filter((effect) => effect.kind === kind).length;
  const lines = [`${id}: cleanup complete.`];
  const removed = [count('removed') && `${count('removed')} unchanged cop${count('removed') === 1 ? 'y' : 'ies'}`,
    count('routing-refreshed') && `${count('routing-refreshed')} Sibu routing reference${count('routing-refreshed') === 1 ? '' : 's'}`].filter(Boolean);
  if (removed.length) lines.push(`  Removed: ${removed.join(', ')}`);
  if (count('unmanaged')) lines.push(`  Kept as your own: ${count('unmanaged')} edited cop${count('unmanaged') === 1 ? 'y' : 'ies'}`);
  for (const path of result.remainingManualReview) lines.push(`  Review yourself: ${path}`);
  return lines;
}

export async function askForRetiredSkillChoice(preview: Preview, index = 1, total = 1,
  choose: Selector = select<RetiredSkillReviewChoice>): Promise<RetiredSkillReviewChoice> {
  for (const line of renderRetiredSkillPreview(preview, process.stdout.columns ?? 80, index, total)) log.info(line);
  const choice = await choose({
    message: `What would you like to do with ${preview.skillId}?`,
    initialValue: 'keep',
    options: [
      { value: 'keep', label: 'Keep for now' },
      ...(preview.canCleanUp ? [{ value: 'clean-up' as const, label: 'Clean up this skill' }] : []),
    ],
  });
  return isCancel(choice) || typeof choice === 'symbol' ? 'cancel' : choice;
}
