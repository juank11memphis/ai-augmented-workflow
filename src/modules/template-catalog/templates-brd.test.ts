import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MANDATORY_SKILLS, SUPPORTED_AGENTS, getSkillTargetsForAgents, readTemplate, readTemplateManifest, renderTemplateForSync } from './index.js';

const writerPath = 'skills/business-requirements-writer/SKILL.md';

describe('BRD authoring instruction contract (not model behavior)', () => {
  it('replaces the source and defines typed business content with traceability', () => {
    const contents = readTemplate(writerPath);
    assert.equal(readTemplateManifest().templates['skills/feature-brief-writer/SKILL.md'], undefined);
    assert.match(contents, /name: business-requirements-writer/);
    assert.match(contents, /docs\/features\/<feature-slug>\/brd\.md/);
    for (const concept of ['Business Need', 'Measurable Success', 'Stakeholders and Needs', 'Scope and Exclusions', 'Business Rules', 'Acceptance Criteria', 'Product Vision Fit', 'Business Domain Model Fit', 'Capability Coverage']) {
      assert.ok(contents.includes(concept), concept);
    }
    assert.match(contents, /Type:.*business \/ stakeholder \/ functional \/ quality \/ transition/);
    assert.match(contents, /Objectives: OBJ-01/);
    assert.match(contents, /AC-01 \(REQ-01\)/);
    assert.match(contents, /Preserve existing IDs when editing or reordering/);
    assert.match(contents, /do not renumber existing entries or reuse removed IDs/);
    assert.match(contents, /missing, invalid, or conflicting references/);
    assert.match(contents, /source BRD path and its existing IDs/);
  });

  it('preserves discovery, upstream stops, ownership, and user-directed progression', () => {
    const contents = readTemplate(writerPath);
    for (const path of ['product-vision', 'business-domain-model', 'capabilities-map']) {
      assert.ok(contents.includes(`docs/${path}.md`));
      assert.ok(contents.includes(`${path}-writer`));
    }
    assert.match(contents, /Do not start a BRD if/);
    assert.match(contents, /one focused question at a time about remaining material gaps/);
    assert.match(contents, /Do not mechanically re-ask adequately settled questions/);
    assert.match(contents, /no question-count limit/);
    assert.match(contents, /final check-in/);
    assert.match(contents, /Never fabricate numeric targets/);
    assert.match(contents, /not empty enterprise sections/);
    assert.match(contents, /does not own UI interaction design, technical architecture/);
    assert.match(contents, /Do not add approval fields/);
    assert.match(contents, /never automatically execute the next stage/);
    assert.match(contents, /not a universal format, certification, or IIBA endorsement/);
    assert.match(contents, /No runtime network lookup/);
  });
});

const consumers = ['ux-expert', 'technical-design-writer', 'scrum-master-planner', 'ai-implementation-planner', 'ai-implementation-plan-executor', 'ai-implementation-planner-toolbox', 'ai-implementation-executor-toolbox'];

describe('BRD downstream instruction contracts', () => {
  for (const name of consumers) {
    it(`${name} carries qualified references without a BRD approval gate`, () => {
      const contents = readTemplate(`skills/${name}/SKILL.md`);
      assert.match(contents, /docs\/features\/<feature-slug>\/brd\.md/);
      assert.match(contents, /source BRD (requirement IDs|IDs)/);
      assert.match(contents, /verify IDs resolve to its entries/);
      assert.match(contents, /missing, invalid, or conflicting references/);
      assert.match(contents, /Require sufficient BRD context, not approval fields/);
      assert.doesNotMatch(contents, /(?:an approved BRD|approved feature brief|feature_brief\.md)/i);
      if (name.includes('implementation')) {
        assert.match(contents, /Worker packets must carry the source BRD path and applicable IDs/);
        assert.match(contents, /not copy the full requirement catalog or broaden worker authority/);
      }
    });
  }
  it('retains unrelated review and mutation safeguards', () => {
    assert.match(readTemplate('AGENTS.md'), /propose a brief plan and wait for user confirmation/);
    assert.match(readTemplate('skills/ai-implementation-executor-toolbox/SKILL.md'), /Never approve your own work/);
    assert.match(readTemplate('skills/technical-design-writer/SKILL.md'), /docs\/deep-module-map\.md.*missing/);
    assert.match(readTemplate('skills/scrum-master-planner/SKILL.md'), /BRD or technical design is missing/);
  });
});

describe('BRD Notion source conversion contract', () => {
  for (const templatePath of ['skills/export-to-notion/SKILL.md', '.codex/agents/notion-exporter.toml', '.gemini/agents/notion-exporter.md', '.claude/agents/notion-exporter.md']) {
    it(`preserves meaning and mutation safeguards in ${templatePath}`, () => {
      const contents = readTemplate(templatePath);
      assert.match(contents, /brd\.md/);
      assert.match(contents, /page title `Business Requirements Document`/);
      assert.match(contents, /Preserve requirement IDs, objective links, business rules, and acceptance content/);
      assert.match(contents, /explicit opt-in/i);
      assert.match(contents, /(?:Do not modify local repository files|Do not write Notion URLs back)/);
      assert.match(contents, /(?:missing.*fail clearly|fail clearly.*missing)/is);
      assert.match(contents, /(?:narrow export packet|specific export packet)/);
      assert.doesNotMatch(contents, /feature_brief|Feature Brief/);
    });
  }
});


describe('BRD catalog distribution', () => {
  it('resolves exactly one mandatory writer for every supported agent', () => {
    const writers = MANDATORY_SKILLS.filter((skill) => skill.templateRelativePath === writerPath);
    assert.equal(writers.length, 1);
    assert.ok(!MANDATORY_SKILLS.some((skill) => skill.templateRelativePath.includes('feature-brief-writer')));
    for (const agent of SUPPORTED_AGENTS) {
      const targets = getSkillTargetsForAgents(writers[0]!, [agent]);
      assert.equal(targets.length, 1);
      assert.equal(targets[0]?.targetRelativePath, '.agents/skills/business-requirements-writer/SKILL.md');
      assert.equal(targets[0]?.templateRelativePath, writerPath);
      assert.match(readTemplate(targets[0]!.templateRelativePath), /name: business-requirements-writer/);
    }
  });
  it('resolves every registered source and renders exclusive BRD routing', () => {
    for (const path of Object.keys(readTemplateManifest().templates)) {
      assert.ok(readTemplate(path).length > 0, path);
    }
    const rendered = renderTemplateForSync({ templateRelativePath: 'AGENTS.md', currentPath: 'missing-agents.md', selectedLanguageSkills: [], selectedFrameworkSkills: [] });
    assert.match(rendered, /business-requirements-writer/);
    assert.doesNotMatch(rendered, /feature-brief-writer|feature_brief/);
    assert.match(rendered, /UX when the feature has UI impact/);
  });
});
