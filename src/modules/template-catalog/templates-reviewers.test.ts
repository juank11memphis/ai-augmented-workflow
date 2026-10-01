import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const toolboxPath = 'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md';
const wrapperPaths = [
  '.codex/agents/sibu-architecture-reviewer.toml',
  '.claude/agents/sibu-architecture-reviewer.md',
  '.gemini/agents/sibu-architecture-reviewer.md',
];

describe('plan-only architecture reviewer', () => {
  const toolbox = readTemplate(toolboxPath);

  it('requires exact plan identity and independently verifies authoritative sources', () => {
    for (const expected of ['exactly one User Story', 'reviewable plan identity and content', 'Epic brief', 'source BRD', 'project SAD', 'feature SDD with embedded diagrams', 'selected architecture guidance', 'source-verified **start here**']) {
      assert.ok(toolbox.includes(expected), expected);
    }
    assert.match(toolbox, /Independently verify references against the full authoritative paths and the actual plan/i);
    assert.match(toolbox, /No code diff, changed-file list, or executor validation summary is review evidence/i);
  });

  it('reports simplicity first, then plan quality, with explicit absence and useful fixes', () => {
    const headings = ['Over-engineering', 'Premature optimization', 'Architecture and contract fit', 'Scope, acceptance-criteria coverage, and Task sizing', 'Executable checks and failure handling'];
    let previous = -1;
    for (const heading of headings) {
      const position = toolbox.indexOf(`**${heading}:**`);
      assert.ok(position > previous, heading);
      previous = position;
    }
    assert.match(toolbox, /even when a category has no finding/i);
    assert.match(toolbox, /plan location, evidence, consequence, and smallest adequate fix/i);
    assert.match(toolbox, /Distinguish a source-required constraint from a preference/i);
    assert.match(toolbox, /speculative caching/i);
    assert.match(toolbox, /missing, vague, or weakened checks are findings/i);
    assert.match(toolbox, /clean review may retain unresolved risks/i);
    assert.match(toolbox, /previously supplied finding is resolved, persists, or was superseded/i);
    assert.match(toolbox, /Prior finding dispositions: <resolved \| persists \| superseded/i);
    assert.match(toolbox, /Do not return an approval verdict for execution/i);
  });

  it('covers the representative plan-review failure cases without a code-review target', () => {
    const cases = [
      { scenario: 'simple plan with no findings', evidence: /even when a category has no finding/i },
      { scenario: 'speculative abstraction', evidence: /needless layers, abstractions, dependencies/i },
      { scenario: 'premature caching', evidence: /speculative caching/i },
      { scenario: 'missing Task check', evidence: /missing, vague, or weakened checks are findings/i },
    ];
    for (const { scenario, evidence } of cases) {
      assert.match(toolbox, evidence, scenario);
    }
    assert.match(toolbox, /Reviewed plan identity: <exact identity and plan path>/i);
    assert.doesNotMatch(toolbox, /Inspect the actual current local diff/i);
  });

  it('keeps all host wrappers thin, equivalent, and read-only', () => {
    for (const path of wrapperPaths) {
      const wrapper = readTemplate(path);
      assert.match(wrapper, /exact Sibu Story plan/i);
      assert.match(wrapper, /exact reviewable plan identity/i);
      assert.match(wrapper, /Review the plan only, never an implementation diff/i);
      assert.match(wrapper, /Remain read-only/i);
      assert.match(wrapper, /never edit plans, implementation, or repository files/i);
      assert.match(wrapper, /write approval metadata, commit, stash, reset/i);
      assert.match(wrapper, /ai-implementation-architecture-reviewer-toolbox\/SKILL\.md/i);
      assert.ok(wrapper.split('\n').length <= 20, path);
      if (path.startsWith('.codex/')) assert.match(wrapper, /developer_instructions =/);
    }
    assert.match(toolbox, /Never modify repository files, plans, implementation/i);
    assert.match(toolbox, /Never persist the packet, write approval metadata, approve execution or Story review/i);
  });

  it('ships current-version notes for the atomic reviewer contract', () => {
    const manifest = readTemplateManifest();
    for (const path of [toolboxPath, ...wrapperPaths]) {
      assert.match(manifest.templates[path]?.changes.join(' ') ?? '', /plan review|plan-only|plan reviewer/i, path);
    }
  });
});
