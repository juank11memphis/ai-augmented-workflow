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
    const packaged = readTemplate(`skills/${writers[1]}/SKILL.md`);
    const installed = fs.readFileSync(path.resolve(`.agents/skills/${writers[1]}/SKILL.md`), 'utf8');
    for (const sdd of [packaged, installed]) {
      assert.match(sdd, /Every SDD embeds at least one explanatory Mermaid diagram/);
      assert.match(sdd, /main-flow sequence diagram for the happy-path scenario.*trigger.*participants.*response/);
      assert.match(sdd, /one scenario per Mermaid diagram/);
      assert.match(sdd, /each meaningful failure or edge case that needs visual explanation its own titled diagram/);
      assert.match(sdd, /rather than packing alternative outcomes into the main flow or one omnibus diagram/);
      assert.match(sdd, /Describe simple variants in prose instead of diagramming every possibility/);
      assert.match(sdd, /structural flowchart, state or data diagram/);
      assert.match(sdd, /explain why a sequence would misrepresent/);
      assert.match(sdd, /no completed SDD is diagram-free/);
    }
  });

  it('places a concrete verification proposal and correction before the separate final check-in', () => {
    const sdd = readTemplate('skills/software-design-writer/SKILL.md');
    const discovery = sdd.split('## Discovery and user control\n')[1].split('\n## Embedded Mermaid validation')[0];
    const proposal = discovery.indexOf('present the engineer with a concise, feature-specific proposed verification approach');
    const correction = discovery.indexOf('Ask the engineer to confirm or correct this direction');
    const finalCheckIn = discovery.indexOf('perform a final conversational check-in');
    assert.ok(proposal >= 0 && proposal < correction && correction < finalCheckIn);
    assert.match(discovery, /restat(?:e|ing) a changed approach for confirmation before writing/);
    assert.match(discovery, /If the final check-in changes verification direction, restate and reconfirm/);
    assert.match(discovery, /check-in cannot substitute for them/);
  });

  it('states the proposal dimensions and records a settled, non-formal quality strategy', () => {
    const sdd = readTemplate('skills/software-design-writer/SKILL.md');
    const quality = sdd.split('## Quality strategy\n')[1].split('\n## Visual explanation')[0];
    const discovery = sdd.split('## Discovery and user control\n')[1].split('\n## Embedded Mermaid validation')[0];
    for (const concept of ['what will be verified', 'by what methods', 'relevant scenarios or surfaces', 'what evidence', 'human-owned', 'meaningful exclusions or validation constraints']) {
      assert.ok(discovery.includes(concept), concept);
    }
    assert.match(discovery, /focused follow-ups/);
    assert.match(discovery, /Do not invent exact commands when they are unknown/);
    assert.match(quality, /settled verification approach as an easy-to-find SDD quality strategy/);
    assert.match(quality, /relevant source BRD requirement IDs/);
    assert.match(quality, /without turning the section into an approval record or a universal test-method checklist/);
    assert.match(discovery, /Do not add approval fields, signatures, or approval statuses/);
    assert.match(discovery, /Do not add routine Story, Task, or Milestone approval pauses/);
  });

  it('branches UI visual-fidelity guidance from non-UI verification', () => {
    const sdd = readTemplate('skills/software-design-writer/SKILL.md');
    const discovery = sdd.split('## Discovery and user control\n')[1].split('\n## Embedded Mermaid validation')[0];
    assert.match(discovery, /For UI-changing features, derive named screens, states, and breakpoints from the binding UX mockups/);
    assert.match(discovery, /person will compare visual fidelity against those mockups, separately from functional tests and automated accessibility checks/);
    assert.match(discovery, /automation does not prove subjective visual quality/);
    assert.match(discovery, /For non-UI features, omit visual-review boilerplate/);
  });
});

describe('atomic SAD/SDD distribution and consumer contracts', () => {
  it('registers mandatory replacement writers for every supported agent', () => {
    const manifest = readTemplateManifest();
    for (const writer of writers) {
      const source = `skills/${writer}/SKILL.md`;
      assert.ok(MANDATORY_SKILLS.some((skill) => skill.templateRelativePath === source));
      assert.match(manifest.templates[source]?.changes.join(' ') ?? '', writer === 'software-architecture-writer' ? /next step/ : /individual Mermaid diagrams/);
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
