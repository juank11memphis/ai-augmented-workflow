import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const architectureToolboxPath = 'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md';

const reviewerWrappers = [
  { path: '.codex/agents/sibu-architecture-reviewer.toml', role: 'architecture', toolbox: architectureToolboxPath },
  { path: '.claude/agents/sibu-architecture-reviewer.md', role: 'architecture', toolbox: architectureToolboxPath },
  { path: '.gemini/agents/sibu-architecture-reviewer.md', role: 'architecture', toolbox: architectureToolboxPath },
] as const;

describe('specialist implementation reviewer toolboxes', () => {
  it('defines the isolated architecture review contract', () => {
    const contents = readTemplate(architectureToolboxPath);

    assert.match(contents, /exactly one User Story and one story-local implementation-plan folder/i);
    for (const requiredContext of ['Epic brief', 'source BRD', 'project SAD', 'feature SDD', 'embedded diagrams', 'selected architecture skill', 'review-round number', 'changed-file list', 'current local-change scope', 'executor validation summary', 'actual current local diff']) {
      assert.match(contents, new RegExp(requiredContext, 'i'));
    }
    assert.match(contents, /Deep Module, feature-slice, layer, and file ownership/i);
    assert.match(contents, /dependency direction, boundaries, and contract compatibility/i);
    assert.match(contents, /Command\/Handler\/Port\/Adapter flow/i);
    assert.match(contents, /unnecessary complexity/i);
    assert.match(contents, /premature optimization, reinvention, and unusual approaches/i);
    assert.match(contents, /production dependency.*human_decision_required/is);
    assert.match(contents, /Keep this review focused on architecture/i);
    assert.doesNotMatch(contents, /^- test sufficiency/im);
  });

  it('enforces the architecture evidence-based verdict and finding contract', () => {
    const contents = readTemplate(architectureToolboxPath);

    assert.match(contents, /Verdict: approved \| changes_required \| human_decision_required/);
    assert.match(contents, /id: ARCH-01/);
    assert.match(contents, /severity: blocker \| major/);
    assert.match(contents, /file\/location/);
    assert.match(contents, /evidence:/);
    assert.match(contents, /violated expectation:/);
    assert.match(contents, /required outcome:/);
    assert.match(contents, /Minor notes:/);
    assert.match(contents, /Unresolved risks:/);
    assert.match(contents, /Minor notes alone cannot produce `changes_required`/i);
    assert.match(contents, /no blocker or major findings and no unresolved human decision/i);
    assert.match(contents, /stable `ARCH-<number>` identifiers/i);
  });

  it('keeps architecture review read-only and conversational', () => {
    const contents = readTemplate(architectureToolboxPath);

    assert.match(contents, /Never modify repository files, implementation work, plans, designs, tests, or dependencies/i);
    assert.match(contents, /Never persist the review packet/i);
    assert.match(contents, /write approval metadata/i);
    assert.match(contents, /commit, stash, reset/i);
    assert.match(contents, /other Git mutation/i);
    assert.match(contents, /Review packets remain workflow messages only/i);
    assert.match(contents, /Do not rely on copied patches or the main agent's full conversation/i);
  });

  it('keeps targeted references subordinate to independent source and diff review', () => {
    const contents = readTemplate(architectureToolboxPath);
    assert.match(contents, /source-verified \*\*start here\*\* references/i);
    assert.match(contents, /independently verify every reference against the full authoritative paths and actual unchanged diff/i);
    assert.match(contents, /locate uncertain precise references from the full source path/i);
    assert.match(contents, /Expand to wider sections or complete artifacts/i);
    assert.match(contents, /An omitted packet reference never excludes/i);
    assert.match(contents, /material packet\/source conflict.*human_decision_required/i);
    assert.match(contents, /SAD\/SDD module boundaries and dependency constraints/i);
  });
});

describe('specialist implementation reviewer wrappers', () => {
  it('registers all reviewer source templates with current-version notes', () => {
    const manifest = readTemplateManifest();

    for (const path of [architectureToolboxPath, ...reviewerWrappers.map((wrapper) => wrapper.path)]) {
      const metadata = manifest.templates[path];
      assert.match(metadata?.description ?? '', /review/i);
      assert.match(metadata?.changes.join('\n') ?? '', /Adds|Installs|Guides|Removes/i);
    }
    assert.equal(readFileSync(`.agents/${architectureToolboxPath}`, 'utf8'), readTemplate(architectureToolboxPath));
    assert.ok(Number(manifest.templates[architectureToolboxPath]?.version) >= 2);
  });

  it('keeps each host wrapper thin, role-specific, and read-only', () => {
    for (const wrapper of reviewerWrappers) {
      const contents = readTemplate(wrapper.path);
      const installedToolboxPath = `.agents/${wrapper.toolbox}`;

      assert.match(contents, new RegExp(`Sibu ${wrapper.role} reviewer worker`, 'i'));
      assert.match(contents, new RegExp(installedToolboxPath.replaceAll('.', '\\.').replaceAll('/', '\\/')));
      assert.match(contents, /narrow reviewer packet/i);
      assert.match(contents, /full conversation context/i);
      assert.match(contents, /exactly one story and plan/i);
      assert.match(contents, /Remain read-only/i);
      assert.match(contents, /never edit implementation or repository files/i);
      assert.match(contents, /persist the packet/i);
      assert.match(contents, /write approval metadata/i);
      assert.match(contents, /commit, stash, reset/i);
      assert.match(contents, /concise conversational review packet/i);
      assert.ok(contents.split('\n').length <= 20, `${wrapper.path} should remain thin`);

      if (wrapper.path.startsWith('.codex/')) {
        assert.match(contents, /developer_instructions =/);
        assert.doesNotMatch(contents, /^instructions =/m);
      }

      assert.doesNotMatch(contents, /test sufficiency|readability, cohesion|framework conventions/i);
    }
  });
});
