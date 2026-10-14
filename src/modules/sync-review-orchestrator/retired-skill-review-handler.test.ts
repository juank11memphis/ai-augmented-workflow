import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { sha256 } from '../../shared/hash.js';
import type { SibuState } from '../../shared/types.js';
import { inspectWorkflow } from '../workflow-health-inspector/retirement-inspection.js';
import { lookupSkillIdentity, parseSkillRetirements } from '../template-catalog/retirements.js';
import { createRetiredSkillFileAdapter } from './retired-skill-file-adapter.js';
import { previewRetiredSkill } from './retired-skill-preview.js';
import { applyRetiredSkillReview, type RetiredSkillApplyPorts } from './retired-skill-review-handler.js';
import type { RetiredSkillReviewPorts } from './retired-skill-review-ports.js';

const skillPath = '.agents/skills/former-skill/SKILL.md';
const secondPath = '.gemini/skills/former-skill/SKILL.md';
const otherPath = '.agents/skills/older-skill/SKILL.md';
const routingPath = 'AGENTS.md';
const retirements = parseSkillRetirements({ schemaVersion: 1, retirements: [
  { id: 'former-skill', category: 'workflow', explanation: 'Retired.',
    formerTemplateRelativePath: 'skills/former-skill/SKILL.md',
    formerTargetsByAgent: { codex: [skillPath], gemini: [secondPath], claude: [skillPath] },
    generatedRoutingTargetsByAgent: { codex: [routingPath], gemini: [routingPath], claude: [routingPath] } },
  { id: 'older-skill', category: 'workflow', explanation: 'Also retired.',
    formerTemplateRelativePath: 'skills/older-skill/SKILL.md',
    formerTargetsByAgent: { codex: [otherPath], gemini: [otherPath], claude: [otherPath] },
    generatedRoutingTargetsByAgent: { codex: [routingPath], gemini: [routingPath], claude: [routingPath] } },
] });

function fixture(options: { secondCopy?: boolean; shared?: boolean; unsafeShared?: boolean } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sibu-retired-effect-'));
  const statePath = path.join(root, '.sibu/state.json');
  const files = createRetiredSkillFileAdapter(root, statePath);
  const content = 'Sibu-managed former-skill\n';
  const other = 'Unrelated user notes remain byte-identical.\n';
  const routing = options.unsafeShared ? 'intro\nolder-skill guidance is multi-line\n- former-skill guidance\n'
    : options.shared ? 'intro\n- former-skill guidance\n- older-skill guidance\n'
      : 'intro\n- former-skill guidance\n';
  const state: SibuState = {
    sibuVersion: 'test', templateVersion: 'test', generatedAt: 'test', updatedAt: 'test',
    selectedAgents: options.secondCopy ? ['codex', 'gemini'] : ['codex'],
    selectedArchitectureSkill: 'command-pattern',
    selectedWorkflowSkills: (options.shared ? ['former-skill', 'older-skill'] : ['former-skill']) as unknown as SibuState['selectedWorkflowSkills'],
    managedFiles: {
      [skillPath]: { template: 'skills/former-skill/SKILL.md', templateVersion: '1', sha256: sha256(content) },
      [routingPath]: { template: 'AGENTS.md', templateVersion: '1', sha256: sha256(routing) },
      ...(options.secondCopy ? { [secondPath]: { template: 'skills/former-skill/SKILL.md', templateVersion: '1', sha256: sha256(content) } } : {}),
      ...(options.shared ? { [otherPath]: { template: 'skills/older-skill/SKILL.md', templateVersion: '1', sha256: sha256('older skill\n') } } : {}),
    },
  };
  const write = (relativePath: string, bytes: string) => {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  };
  write('.sibu/state.json', `${JSON.stringify(state, null, 2)}\n`);
  write(skillPath, content);
  write(routingPath, routing);
  write('README.md', other);
  if (options.secondCopy) write(secondPath, content);
  if (options.shared) write(otherPath, 'older skill\n');
  const review: RetiredSkillReviewPorts = {
    catalog: { resolveSkill: (id) => lookupSkillIdentity(id, retirements) },
    state: { read: () => files.state.snapshot().state },
    files: { inspect: files.files.inspect, userReferences: () => [{ path: 'README.md', description: 'User note' }] },
    interaction: { choose: async () => 'keep' },
  };
  const ports: RetiredSkillApplyPorts = { review, retirements: () => retirements, ...files };
  const preview = () => {
    const result = previewRetiredSkill({ type: 'preview-retired-skill', skillId: 'former-skill' }, review);
    assert.equal(result.status, 'preview');
    if (result.status !== 'preview') throw new Error('Preview unavailable');
    return result;
  };
  return { root, statePath, ports, preview, state: () => files.state.snapshot().state,
    bytes: (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8'),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('defer and cancel make zero writes, including to user and architecture state', () => {
  const f = fixture();
  try {
    const offered = f.preview();
    const before = [f.bytes(skillPath), f.bytes(routingPath), f.bytes('README.md'), f.bytes('.sibu/state.json')];
    assert.equal(applyRetiredSkillReview(offered, 'keep', f.ports).status, 'deferred');
    assert.equal(applyRetiredSkillReview(offered, 'cancel', f.ports).status, 'cancelled');
    assert.deepEqual([f.bytes(skillPath), f.bytes(routingPath), f.bytes('README.md'), f.bytes('.sibu/state.json')], before);
  } finally { f.cleanup(); }
});

test('cleanup handler and file adapter add no operational content logging', () => {
  const sources = ['./retired-skill-review-handler.js', './retired-skill-file-adapter.js'];
  for (const source of sources) {
    const contents = fs.readFileSync(new URL(source, import.meta.url), 'utf8');
    assert.doesNotMatch(contents, /console\.|log\.(?:info|error|warn|success)/);
  }
});

test('cleanup preserves shared retired B guidance, selection, doctor finding and user bytes', () => {
  const f = fixture({ shared: true });
  try {
    const userBefore = f.bytes('README.md');
    const architectureBefore = f.state().selectedArchitectureSkill;
    const result = applyRetiredSkillReview(f.preview(), 'clean-up', f.ports);
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.effects.map((effect) => effect.kind), ['removed', 'routing-refreshed', 'selection-removed']);
    assert.equal(fs.existsSync(path.join(f.root, skillPath)), false);
    assert.equal(f.state().managedFiles[skillPath], undefined);
    assert.equal(f.state().managedFiles[routingPath]?.sha256, sha256(f.bytes(routingPath)));
    assert.equal(f.state().managedFiles[routingPath]?.templateVersion, '55');
    assert.equal(f.state().managedFiles[routingPath]?.status, 'managed');
    assert.match(f.bytes(routingPath), /^- older-skill guidance$/m);
    assert.doesNotMatch(f.bytes(routingPath), /^- former-skill guidance$/m);
    assert.deepEqual(f.state().selectedWorkflowSkills, ['older-skill']);
    assert.equal(f.state().selectedArchitectureSkill, architectureBefore);
    assert.equal(f.bytes('README.md'), userBefore);
    const finding = inspectWorkflow({ type: 'inspect-workflow' }, f.state(), {
      resolveSkill: (id) => lookupSkillIdentity(id, retirements), retirements: () => retirements,
      exists: (relativePath) => fs.existsSync(path.join(f.root, relativePath)),
      readText: (relativePath) => f.bytes(relativePath),
    }).findings;
    assert.deepEqual(finding.map((item) => item.skillId), ['older-skill']);
  } finally { f.cleanup(); }
});

test('unsafe shared guidance blocks before any copy, routing, selection or state write', () => {
  const f = fixture({ shared: true, unsafeShared: true });
  try {
    const before = [f.bytes(skillPath), f.bytes(routingPath), f.bytes('.sibu/state.json')];
    const result = applyRetiredSkillReview(f.preview(), 'clean-up', f.ports);
    assert.equal(result.status, 'blocked');
    assert.match(result.reason ?? '', /fresh review/);
    assert.deepEqual([f.bytes(skillPath), f.bytes(routingPath), f.bytes('.sibu/state.json')], before);
    assert.deepEqual(f.state().selectedWorkflowSkills, ['former-skill', 'older-skill']);
  } finally { f.cleanup(); }
});

test('edited copy and edited routing remain byte-identical and become unmanaged', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, skillPath), 'user-edited copy\n');
    fs.writeFileSync(path.join(f.root, routingPath), 'user-edited routing former-skill\n');
    const offered = f.preview();
    const before = [f.bytes(skillPath), f.bytes(routingPath), f.bytes('README.md')];
    const result = applyRetiredSkillReview(offered, 'clean-up', f.ports);
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.effects.map((effect) => effect.kind), ['unmanaged', 'unmanaged', 'selection-removed']);
    assert.deepEqual([f.bytes(skillPath), f.bytes(routingPath), f.bytes('README.md')], before);
    assert.equal(f.state().managedFiles[skillPath]?.status, 'unmanaged');
    assert.equal(f.state().managedFiles[routingPath]?.status, 'unmanaged');
    assert.deepEqual(f.state().selectedWorkflowSkills, []);
    assert.deepEqual(result.remainingManualReview, [routingPath, 'README.md']);
  } finally { f.cleanup(); }
});

test('a second edit after preview cannot be silently adopted as the reviewed copy', () => {
  const f = fixture();
  try {
    fs.writeFileSync(path.join(f.root, skillPath), 'first local edit\n');
    const offered = f.preview();
    fs.writeFileSync(path.join(f.root, skillPath), 'second local edit\n');
    const before = f.bytes('.sibu/state.json');
    const result = applyRetiredSkillReview(offered, 'clean-up', f.ports);
    assert.equal(result.status, 'stale');
    assert.deepEqual(result.effects, []);
    assert.equal(f.bytes(skillPath), 'second local edit\n');
    assert.equal(f.bytes('.sibu/state.json'), before);
  } finally { f.cleanup(); }
});

test('changed hash, missing path, symlink, escape and changed state refuse stale preview', () => {
  for (const change of ['hash', 'missing', 'symlink', 'state'] as const) {
    const f = fixture();
    try {
      const offered = f.preview();
      if (change === 'hash') fs.writeFileSync(path.join(f.root, skillPath), 'edited\n');
      if (change === 'missing') fs.unlinkSync(path.join(f.root, skillPath));
      if (change === 'symlink') {
        fs.unlinkSync(path.join(f.root, skillPath));
        fs.symlinkSync(path.join(f.root, 'README.md'), path.join(f.root, skillPath));
      }
      if (change === 'state') {
        const changed = f.state();
        changed.selectedAgents.push('gemini');
        fs.writeFileSync(f.statePath, `${JSON.stringify(changed)}\n`);
      }
      const afterChange = f.bytes('.sibu/state.json');
      const result = applyRetiredSkillReview(offered, 'clean-up', f.ports);
      assert.equal(result.status, 'stale', change);
      assert.deepEqual(result.effects, [], change);
      assert.equal(f.bytes('.sibu/state.json'), afterChange, change);
    } finally { f.cleanup(); }
  }
  const f = fixture();
  try {
    assert.deepEqual(f.ports.files.inspect('../outside', 'former-skill'), { status: 'unsafe' });
    assert.equal(fs.existsSync(path.join(f.root, 'README.md')), true);
  } finally { f.cleanup(); }
});

test('failed file effect does not claim removal or change state', () => {
  const f = fixture();
  try {
    const offered = f.preview();
    const before = f.bytes('.sibu/state.json');
    const ports = { ...f.ports, files: { ...f.ports.files, removeIfHash: () => false } };
    const result = applyRetiredSkillReview(offered, 'clean-up', ports);
    assert.equal(result.status, 'stale');
    assert.deepEqual(result.effects, []);
    assert.equal(f.bytes('.sibu/state.json'), before);
    assert.equal(fs.existsSync(path.join(f.root, skillPath)), true);
  } finally { f.cleanup(); }
});

test('state-write failure after observed deletion reports partial, never records deletion', () => {
  const f = fixture();
  try {
    const offered = f.preview();
    const before = f.bytes('.sibu/state.json');
    const ports = { ...f.ports, state: { ...f.ports.state, checkpoint: () => { throw new Error('injected'); } } };
    const result = applyRetiredSkillReview(offered, 'clean-up', ports);
    assert.equal(result.status, 'partial');
    assert.deepEqual(result.effects, [{ kind: 'removed', path: skillPath }]);
    assert.equal(fs.existsSync(path.join(f.root, skillPath)), false);
    assert.equal(f.bytes('.sibu/state.json'), before);
    assert.equal(f.preview().canCleanUp, false);
  } finally { f.cleanup(); }
});

test('interrupted multi-effect work checkpoints first copy and later retry safely resumes', () => {
  const f = fixture({ secondCopy: true });
  try {
    const offered = f.preview();
    const remove = f.ports.files.removeIfHash;
    const ports = { ...f.ports, files: { ...f.ports.files,
      removeIfHash: (relativePath: string, hash: string) => relativePath === secondPath ? false : remove(relativePath, hash) } };
    const first = applyRetiredSkillReview(offered, 'clean-up', ports);
    assert.equal(first.status, 'partial');
    assert.deepEqual(first.effects, [{ kind: 'removed', path: skillPath }]);
    assert.equal(f.state().managedFiles[skillPath], undefined);
    assert.ok(f.state().managedFiles[secondPath]);
    assert.equal(fs.existsSync(path.join(f.root, secondPath)), true);
    const retry = applyRetiredSkillReview(f.preview(), 'clean-up', f.ports);
    assert.equal(retry.status, 'completed');
    assert.equal(fs.existsSync(path.join(f.root, secondPath)), false);
    assert.deepEqual(f.state().selectedWorkflowSkills, []);
    assert.equal(f.state().selectedArchitectureSkill, 'command-pattern');
  } finally { f.cleanup(); }
});
