import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import type { SibuState } from '../../shared/types.js';
import { lookupSkillIdentity, parseSkillRetirements } from '../template-catalog/retirements.js';
import { previewRetiredSkill } from './retired-skill-preview.js';
import type { RetiredSkillFileSnapshot, RetiredSkillReviewPorts } from './retired-skill-review-ports.js';

const skillPath = '.agents/skills/former-skill/SKILL.md';
const retirements = parseSkillRetirements({ schemaVersion: 1, retirements: [
  { id: 'former-skill', category: 'workflow', explanation: 'No longer provided.',
    formerTemplateRelativePath: 'skills/former-skill/SKILL.md',
    formerTargetsByAgent: { codex: [skillPath], gemini: [skillPath], claude: [skillPath] },
    generatedRoutingTargetsByAgent: { codex: ['AGENTS.md'], gemini: ['AGENTS.md', 'GEMINI.md'],
      claude: ['AGENTS.md', 'CLAUDE.md'] } },
  { id: 'old-required', category: 'mandatory', explanation: 'Superseded.',
    formerTemplateRelativePath: 'skills/old-required/SKILL.md',
    formerTargetsByAgent: { codex: ['.agents/skills/old-required/SKILL.md'],
      gemini: ['.agents/skills/old-required/SKILL.md'], claude: ['.agents/skills/old-required/SKILL.md'] },
    generatedRoutingTargetsByAgent: { codex: ['AGENTS.md'], gemini: ['AGENTS.md'], claude: ['AGENTS.md'] } },
] });

function state(): SibuState {
  return { sibuVersion: 'test', templateVersion: 'test', generatedAt: 'test', updatedAt: 'test',
    selectedAgents: ['codex', 'gemini', 'claude'], managedFiles: {} };
}

function fixture(recorded: SibuState, files: Record<string, RetiredSkillFileSnapshot>,
  references: { path: string; description: string }[] = []) {
  let reads = 0;
  const ports: RetiredSkillReviewPorts = {
    catalog: { resolveSkill: (id) => lookupSkillIdentity(id, retirements) },
    state: { read: () => { reads++; return recorded; } },
    files: { inspect: (path) => files[path] ?? { status: 'missing' }, userReferences: () => references },
    interaction: { choose: async () => { throw new Error('Preview must not prompt or mutate.'); } },
  };
  return { preview: (id = 'former-skill') => previewRetiredSkill({ type: 'preview-retired-skill', skillId: id }, ports),
    reads: () => reads };
}

const present = (sha256: string, referencesSkill = false): RetiredSkillFileSnapshot =>
  ({ status: 'present', sha256, referencesSkill });
const recorded = (template: string, status?: 'managed' | 'customized' | 'unmanaged') =>
  ({ template, templateVersion: '1', sha256: 'recorded', status });

test('classifies every ownership class and exact multi-agent paths without mutating input', () => {
  const current = state();
  current.selectedWorkflowSkills = ['former-skill' as 'ux-expert'];
  current.managedFiles[skillPath] = recorded('skills/former-skill/SKILL.md');
  current.managedFiles['AGENTS.md'] = recorded('AGENTS.md');
  current.managedFiles['GEMINI.md'] = recorded('GEMINI.md', 'customized');
  current.managedFiles['CLAUDE.md'] = recorded('CLAUDE.md', 'unmanaged');
  const files = { [skillPath]: present('recorded'), 'AGENTS.md': present('recorded', true),
    'GEMINI.md': present('edited', true), 'CLAUDE.md': present('other', true) };
  const before = structuredClone(current);
  const result = fixture(current, files, [{ path: 'README.md', description: 'Manual mention' }]).preview();
  assert.equal(result.status, 'preview');
  if (result.status !== 'preview') return;
  assert.equal(result.selected, true);
  assert.deepEqual(result.choices, ['keep', 'clean-up', 'cancel']);
  assert.deepEqual(result.remove.map((item) => item.path), [skillPath]);
  assert.deepEqual(result.removeFromSibuGuidance.map((item) => item.path), ['AGENTS.md']);
  assert.deepEqual(result.keepAsOwn.map((item) => item.path), ['GEMINI.md']);
  assert.deepEqual(result.reviewYourself.map((item) => item.path), ['GEMINI.md', 'CLAUDE.md', 'README.md']);
  assert.equal(result.canCleanUp, true);
  assert.deepEqual(current, before);
  assert.deepEqual(files, { [skillPath]: present('recorded'), 'AGENTS.md': present('recorded', true),
    'GEMINI.md': present('edited', true), 'CLAUDE.md': present('other', true) });
});

test('stale managed label never authorizes deletion; customized and user-created copies stay', () => {
  for (const status of [undefined, 'customized', 'unmanaged'] as const) {
    const current = state();
    current.managedFiles[skillPath] = recorded('skills/former-skill/SKILL.md', status);
    const result = fixture(current, { [skillPath]: present('edited') }).preview();
    assert.equal(result.status, 'preview');
    if (result.status !== 'preview') continue;
    assert.deepEqual(result.remove, []);
    assert.deepEqual((status === 'unmanaged' ? result.reviewYourself : result.keepAsOwn).map((item) => item.path), [skillPath]);
  }
  const userOwned = fixture(state(), { [skillPath]: present('own') }).preview();
  assert.equal(userOwned.status, 'preview');
  if (userOwned.status === 'preview') assert.deepEqual(userOwned.reviewYourself.map((item) => item.path), [skillPath]);
});

test('formerly mandatory skill needs no selection; missing and unsafe evidence block cleanup', () => {
  const current = state();
  const requiredPath = '.agents/skills/old-required/SKILL.md';
  current.managedFiles[requiredPath] = recorded('skills/old-required/SKILL.md');
  current.managedFiles['AGENTS.md'] = recorded('AGENTS.md');
  const result = fixture(current, { [requiredPath]: { status: 'missing' }, 'AGENTS.md': { status: 'unsafe' } })
    .preview('old-required');
  assert.equal(result.status, 'preview');
  if (result.status !== 'preview') return;
  assert.equal(result.selected, false);
  assert.equal(result.canCleanUp, false);
  assert.deepEqual(result.uncertain.map((item) => item.path), [requiredPath, 'AGENTS.md']);
  assert.deepEqual(result.remove, []);
});

test('an edited managed routing file is preserved and its reference remains for review', () => {
  const current = state();
  current.managedFiles['AGENTS.md'] = recorded('AGENTS.md');
  const result = fixture(current, { 'AGENTS.md': present('locally-edited', true) }).preview();
  assert.equal(result.status, 'preview');
  if (result.status !== 'preview') return;
  assert.deepEqual(result.removeFromSibuGuidance, []);
  assert.deepEqual(result.keepAsOwn.map((item) => item.path), ['AGENTS.md']);
  assert.deepEqual(result.reviewYourself.map((item) => item.path), ['AGENTS.md']);
});

test('missing ownership hash is uncertain and cannot authorize deletion', () => {
  const current = state();
  current.managedFiles[skillPath] = { ...recorded('skills/former-skill/SKILL.md'), sha256: '' };
  const result = fixture(current, { [skillPath]: present('some-content') }).preview();
  assert.equal(result.status, 'preview');
  if (result.status !== 'preview') return;
  assert.equal(result.canCleanUp, false);
  assert.deepEqual(result.remove, []);
  assert.deepEqual(result.uncertain.map((item) => item.path), [skillPath]);
});

test('unrecognized identity has no cleanup offer and preview imports no terminal or filesystem handler', () => {
  assert.deepEqual(fixture(state(), {}).preview('unknown'), { status: 'not-retired', skillId: 'unknown' });
  const source = readFileSync(new URL('./retired-skill-preview.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /(?:from|require\()\s*['"](?:node:(?:fs|readline)|\.\/handler|\.\/action-prompt)/);
});
