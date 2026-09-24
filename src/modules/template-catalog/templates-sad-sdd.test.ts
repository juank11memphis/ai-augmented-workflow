import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { MANDATORY_SKILLS, SUPPORTED_AGENTS, getSkillTargetsForAgents, readTemplate, readTemplateManifest } from './index.js';

const writers = ['software-architecture-writer', 'software-design-writer'];

describe('SAD/SDD instruction contracts (static, not model behavior)', () => {
  it('retains architecture substance and independent business prerequisites', () => {
    const sad = readTemplate(`skills/${writers[0]}/SKILL.md`);
    for (const concept of ['docs/architecture.md', 'docs/product-vision.md', 'docs/business-domain-model.md', 'docs/capabilities-map.md', 'arc42', 'C4', 'stable name/slug', 'outside promise/interface', 'owned responsibilities', 'excluded responsibilities', 'hidden complexity', 'relevant dependencies', 'runtime scenarios', 'deployment', 'Cross-cutting', 'quality goals', 'risks', 'domain vocabulary', 'observed implementation', 'intended architecture']) {
      assert.ok(sad.includes(concept), concept);
    }
    assert.match(sad, /No feature BRD is required/);
    assert.match(sad, /C4 container is not automatically a deep module/);
    assert.match(sad, /Deployment diagrams are allowed/);
    assert.match(readTemplate('skills/business-requirements-writer/SKILL.md'), /BRD authoring does not require `docs\/architecture\.md`/);
  });

  it('requires grounded feature design and routes real architecture changes upstream', () => {
    const sdd = readTemplate(`skills/${writers[1]}/SKILL.md`);
    for (const concept of ['docs/features/<feature-slug>/sdd.md', 'docs/architecture.md', 'docs/features/<feature-slug>/brd.md', 'docs/features/<feature-slug>/ux.md', 'source BRD requirement IDs', 'verify IDs resolve', 'security/concurrency', 'quality strategy', 'without copying the entire SAD']) {
      assert.ok(sdd.includes(concept), concept);
    }
    assert.match(sdd, /missing required UX routes to `ux-expert`/);
    assert.match(sdd, /pause SDD work/);
    assert.match(sdd, /Do not edit the SAD or invent new modules/);
    assert.match(sdd, /Resume only after corrected SAD context and a user request/);
    assert.match(sdd, /Local algorithms and interface details that fit existing boundaries stay within SDD scope/);
    assert.match(sdd, /UI mockups in UX are binding goals/);
    assert.match(sdd, /Separate planned verification from commands actually run/);
  });

  for (const writer of writers) {
    it(`${writer} preserves discovery, architecture and truthful validation`, () => {
      const contents = readTemplate(`skills/${writer}/SKILL.md`);
      for (const concept of ['selected architecture', 'sibu sync', 'Conflicts', 'one focused question at a time', 'settled answers', 'meaningful follow-ups', 'no question-count limit', 'final conversational check-in', 'wait for the response', 'Do not add approval fields', 'Never automatically execute the next stage', 'exact final Mermaid blocks', 'Correct reported failures and recheck', 'tool/version', 'Parsing proves syntax acceptance, not rendering', 'Known unresolved parse/render errors remain blockers', 'manual-only; parser/render validation unavailable', 'without installing dependencies', 'uploading private diagrams externally without permission']) {
        assert.ok(contents.toLowerCase().includes(concept.toLowerCase()), concept);
      }
      assert.doesNotMatch(contents, /technical_design\.md|tech_design_diagrams\.md|deep-module-map-writer/);
    });
  }

  it('requires a meaningful embedded diagram even without interaction flow', () => {
    const sdd = readTemplate(`skills/${writers[1]}/SKILL.md`);
    assert.match(sdd, /Every SDD embeds at least one explanatory Mermaid diagram/);
    assert.match(sdd, /main-flow sequence diagram.*trigger.*participants.*responses.*branches\/failures/);
    assert.match(sdd, /structural flowchart, state or data diagram/);
    assert.match(sdd, /explain why a sequence would misrepresent/);
    assert.match(sdd, /no completed SDD is diagram-free/);
  });
});

describe('atomic SAD/SDD distribution and consumer contracts', () => {
  it('registers mandatory replacement writers for every supported agent', () => {
    const manifest = readTemplateManifest();
    for (const writer of writers) {
      const source = `skills/${writer}/SKILL.md`;
      assert.ok(MANDATORY_SKILLS.some((skill) => skill.templateRelativePath === source));
      assert.match(manifest.templates[source]?.changes.join(' ') ?? '', writer === 'software-architecture-writer' ? /next step/ : /ownership review/);
      for (const agent of SUPPORTED_AGENTS) {
        const targets = getSkillTargetsForAgents(MANDATORY_SKILLS.find((skill) => skill.templateRelativePath === source)!, [agent]);
        assert.ok(targets.some((target) => target.templateRelativePath === source && target.targetRelativePath === `.agents/skills/${writer}/SKILL.md`));
      }
    }
    for (const obsolete of ['deep-module-map-writer', 'technical-design-writer']) {
      assert.equal(manifest.templates[`skills/${obsolete}/SKILL.md`], undefined);
      assert.ok(!MANDATORY_SKILLS.some((skill) => skill.templateRelativePath.includes(obsolete)));
      assert.ok(!fs.existsSync(path.resolve('templates/skills', obsolete)));
    }
  });

  for (const consumer of ['scrum-master-planner', 'ai-implementation-planner', 'ai-implementation-plan-executor', 'ai-implementation-planner-toolbox', 'ai-implementation-executor-toolbox']) {
    it(`${consumer} consumes embedded SDD context without fallback`, () => {
      const contents = readTemplate(`skills/${consumer}/SKILL.md`);
      assert.match(contents, /sdd\.md/);
      assert.match(contents, /embedded diagrams/);
      assert.doesNotMatch(contents, /tech_design_diagrams|technical_design\.md|optional companion/);
      assert.match(contents, /source BRD/);
    });
  }

  for (const source of ['skills/export-to-notion/SKILL.md', '.codex/agents/notion-exporter.toml', '.gemini/agents/notion-exporter.md', '.claude/agents/notion-exporter.md']) {
    it(`${source} preserves feature content and export boundaries`, () => {
      const contents = readTemplate(source);
      for (const text of ['sdd.md', 'Software Design Document', 'embedded Mermaid source', 'native rendering', 'Project SAD export is outside scope', 'opt-in', 'no-local-write']) assert.ok(contents.includes(text), text);
    });
  }
});
