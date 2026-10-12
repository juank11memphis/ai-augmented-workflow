import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SkillRetirement } from '../template-catalog/index.js';
import type { RetiredSkillReviewResult } from './retired-skill-review-result.js';
import { askForRetiredSkillChoice, renderRetiredSkillOutcome, renderRetiredSkillPreview,
  renderRetiredSkillSummary } from './retired-skill-review-prompt.js';

const preview: Extract<RetiredSkillReviewResult, { status: 'preview' }> = {
  status: 'preview', skillId: 'YYY', explanation: 'Sibu no longer provides this skill.',
  stateFingerprint: 'fixture', observedFiles: {}, selected: false, choices: ['keep', 'clean-up', 'cancel'],
  remove: [{ path: '.agents/skills/yyy/SKILL.md', reason: 'unchanged' }],
  keepAsOwn: [{ path: '.other-agent/skills/yyy/SKILL.md', reason: 'edited' }],
  removeFromSibuGuidance: [{ path: 'YYY routing instruction', reason: 'managed' }],
  reviewYourself: [{ path: 'custom reference in AGENTS.md', reason: 'manual' }],
  uncertain: [], canCleanUp: true,
};

test('compact and wide summaries preserve multi-skill order and mandatory distinction', () => {
  const records = [{ id: 'YYY', category: 'workflow' }, { id: 'Old Mandatory Guidance', category: 'mandatory' }] as SkillRetirement[];
  assert.deepEqual(renderRetiredSkillSummary(['YYY', 'Old Mandatory Guidance'], records, 50), [
    'Retired skills need review: 2', '', '1. YYY', '2. Old Mandatory Guidance', '',
    'Review each skill separately. Nothing is removed\nwithout your choice.',
  ]);
  const wide = renderRetiredSkillSummary(['YYY', 'Old Mandatory Guidance'], records, 120).join('\n');
  assert.match(wide, /YYY\s+installed skill/);
  assert.match(wide, /Old Mandatory Guidance\s+formerly mandatory skill/);
  assert.doesNotMatch(wide, /clean up all/i);
});

test('preview semantically matches both binding layouts, with full paths and per-skill focus', () => {
  const compact = renderRetiredSkillPreview(preview, 50, 2, 3).join('\n');
  assert.match(compact, /^Skill 2 of 3\n\nYYY was retired\nSibu no longer provides this skill\./);
  assert.match(compact, /Clean up would:\n  Remove unchanged copy:\n    \.agents\/skills\/yyy\/SKILL\.md/);
  assert.match(compact, /Keep your edited copy as your own:\n    \.other-agent\/skills\/yyy\/SKILL\.md/);
  assert.match(compact, /Leave for your review:\n    custom reference in AGENTS\.md/);
  const wide = renderRetiredSkillPreview(preview, 120).join('\n');
  assert.match(wide, /^YYY was retired — Sibu no longer provides this skill\./);
  assert.match(wide, /Remove from Sibu guidance\s+YYY routing instruction/);
  assert.ok(wide.includes('.other-agent/skills/yyy/SKILL.md'));
});

test('keep is first and default; cleanup explicit; keyboard cancel never selects cleanup', async () => {
  let offered: unknown;
  const choose = async (options: unknown) => { offered = options; return 'keep' as const; };
  assert.equal(await askForRetiredSkillChoice(preview, 1, 1, choose), 'keep');
  assert.deepEqual((offered as { options: { value: string }[] }).options.map((option) => option.value), ['keep', 'clean-up']);
  assert.equal((offered as { initialValue: string }).initialValue, 'keep');
  assert.equal(await askForRetiredSkillChoice(preview, 1, 1, async () => 'clean-up'), 'clean-up');
  assert.equal(await askForRetiredSkillChoice(preview, 1, 1, async () => Symbol('cancel')), 'cancel');
  const uncertain = { ...preview, canCleanUp: false, uncertain: [{ path: 'unsafe/path', reason: 'uncertain' }] };
  await askForRetiredSkillChoice(uncertain, 1, 1, async (options) => {
    assert.deepEqual(options.options.map((option) => option.value), ['keep']);
    return 'keep';
  });
});

test('outcomes report observed effects only, manual references, and fresh-review recovery', () => {
  assert.deepEqual(renderRetiredSkillOutcome({ status: 'deferred', skillId: 'YYY', effects: [], remainingManualReview: [] }),
    ['YYY: kept for now. Doctor will keep flagging it.']);
  const completed = renderRetiredSkillOutcome({ status: 'completed', skillId: 'YYY', effects: [
    { kind: 'removed', path: '.agents/skills/yyy/SKILL.md' }, { kind: 'routing-refreshed', path: 'AGENTS.md' },
    { kind: 'unmanaged', path: '.other-agent/skills/yyy/SKILL.md' },
  ], remainingManualReview: ['custom reference in AGENTS.md'] });
  assert.deepEqual(completed, ['YYY: cleanup complete.', '  Removed: 1 unchanged copy, 1 Sibu routing reference',
    '  Kept as your own: 1 edited copy', '  Review yourself: custom reference in AGENTS.md']);
  const blocked = renderRetiredSkillOutcome({ status: 'stale', skillId: 'Old Mandatory Guidance', effects: [],
    remainingManualReview: [], reason: 'The affected copy changed during review.' });
  assert.deepEqual(blocked, ['Old Mandatory Guidance: not cleaned up.', 'The affected copy changed during review.',
    'Run sync again to review its current contents.']);
  assert.match(renderRetiredSkillOutcome({ status: 'partial', skillId: 'YYY', effects: [
    { kind: 'removed', path: 'file' }], remainingManualReview: [] }).join('\n'), /Completed before stopping: removed file/);
});
