import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
  getTemplateVersion,
  readTemplate,
  readTemplateManifest,
} from './index.js';
import { renderTemplateForSync, renderWorkerToolboxRouting } from './templates.js';

const selectedTypescriptSkill = SELECTABLE_LANGUAGE_SKILLS.find((skill) => skill.id === 'typescript')!;
const selectedReactSkill = SELECTABLE_FRAMEWORK_SKILLS.find((skill) => skill.id === 'react')!;
const selectedCommandPatternSkill = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!;
const selectedPostgresqlSkill = SELECTABLE_DATABASE_SKILLS.find((skill) => skill.id === 'postgresql-expert')!;
const selectedPromptEngineeringSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ai-prompt-engineer-master')!;
const selectedUxSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ux-expert')!;
const selectedGithubExportSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'export-to-github')!;
const selectedNotionExportSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'export-to-notion')!;


describe('dedicated exporter skill templates', () => {
  it('registers and renders the GitHub exporter skill', () => {
    const templatePath = 'skills/export-to-github/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    assert.match(templateMetadata?.description ?? '', /GitHub export skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /GitHub exporter spawns/i);
    assert.match(contents, /name: export-to-github/);
    assert.match(contents, /github-exporter/);
    assert.match(contents, /clean, narrow export packet/);
    assert.match(contents, /Do not call `wait_agent`/);
    assert.match(contents, /completion will arrive via sub-agent notification/);
    assert.match(contents, /### Delegated workflow/);
    assert.match(contents, /### Inline fallback workflow/);
    assert.match(contents, /Use inline fallback only when delegation is unavailable or has failed and the user explicitly accepts inline fallback/);
    assert.match(contents, /feature name/i);
    assert.match(contents, /Epics and User Stories/i);
    assert.match(contents, /native sub-issues/i);
    assert.match(contents, /GitHub MCP/i);
    assert.match(contents, /Do not modify local Markdown files with GitHub URLs/i);
  });

  it('registers and renders the Notion exporter skill', () => {
    const templatePath = 'skills/export-to-notion/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    assert.match(templateMetadata?.description ?? '', /Notion export skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Notion exporter spawns/i);
    assert.match(contents, /name: export-to-notion/);
    assert.match(contents, /notion-exporter/);
    assert.match(contents, /clean, narrow export packet/);
    assert.match(contents, /Do not call `wait_agent`/);
    assert.match(contents, /completion will arrive via sub-agent notification/);
    assert.match(contents, /### Delegated workflow/);
    assert.match(contents, /### Inline fallback workflow/);
    assert.match(contents, /Use inline fallback only when delegation is unavailable or has failed and the user explicitly accepts inline fallback/);
    assert.match(contents, /feature name/i);
    assert.match(contents, /brd\.md/);
    assert.match(contents, /ux\.md/);
    assert.match(contents, /sdd\.md/);
    assert.match(contents, /Do not export Epics, User Stories, implementation plans, product vision, Software Architecture Documents, or arbitrary docs/i);
    assert.match(contents, /Do not write Notion URLs back into local Markdown/i);
  });

  it('registers target-native exporter sub-agent templates', () => {
    const manifest = readTemplateManifest();
    const templatePaths = [
      '.codex/agents/github-exporter.toml',
      '.codex/agents/notion-exporter.toml',
      '.claude/agents/github-exporter.md',
      '.claude/agents/notion-exporter.md',
      '.gemini/agents/github-exporter.md',
      '.gemini/agents/notion-exporter.md',
    ];

    for (const templatePath of templatePaths) {
      const templateMetadata = manifest.templates[templatePath];
      const contents = readTemplate(templatePath);
      const isCodexAgentTemplate = templatePath.startsWith('.codex/');
      assert.match(templateMetadata?.description ?? '', /exporter sub-agent/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', templatePath.includes('notion-exporter') ? /SAD|SDD/i : /concise reporting guidance/i);
      assert.match(contents, /sub-agent/i);
      assert.match(contents, /full conversation context/i);
      assert.match(contents, /Do not modify local repository files/i);
      assert.match(contents, /explicit opt-in/i);
      if (isCodexAgentTemplate) {
        assert.match(contents, /developer_instructions =/);
        assert.doesNotMatch(contents, /^instructions =/m);
      }
    }
  });
});

describe('session-start hook templates', () => {
  it('registers and renders managed session-start hook templates', () => {
    const manifest = readTemplateManifest();
    const templatePaths = ['.codex/hooks.json', '.claude/settings.json', '.gemini/settings.json'];

    for (const templatePath of templatePaths) {
      const templateMetadata = manifest.templates[templatePath];
      const contents = readTemplate(templatePath);
      assert.match(templateMetadata?.description ?? '', /SessionStart hook/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', /managed .*SessionStart hook/i);
      assert.match(contents, /SessionStart/);
      assert.match(contents, /npm view @juancr11\/sibu version/);
      assert.match(contents, /Sibu latest version:/);
      assert.match(contents, /Sibu version check unavailable; continuing to sibu doctor\./);
      assert.match(contents, /sibu doctor/);
      assert.match(contents, /sibu doctor(?: >&2)? \|\| true/);
      assert.doesNotMatch(contents, /sibu hook session-start/);
      assert.doesNotMatch(contents, /NPM_TOKEN|NODE_AUTH_TOKEN|npmrc/);
    }
  });
});

describe('framework skill templates', () => {
  it('routes Next.js App Router UI component design to React when installed', () => {
    const templatePath = 'skills/nextjs/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
    assert.match(contents, /name: nextjs/);
    assert.match(contents, /also use `react` when that skill is installed/);
    assert.match(contents, /component responsibility, props, state ownership, or component boundaries/);
  });
});

describe('downstream selected architecture guidance gates', () => {
  it('requires downstream skill templates to hard-stop and route missing architecture repair to sibu sync', () => {
    const templatePaths = [
      'skills/software-design-writer/SKILL.md',
      'skills/ai-implementation-planner/SKILL.md',
      'skills/ai-implementation-plan-executor/SKILL.md',
      'skills/ai-implementation-planner-toolbox/SKILL.md',
      'skills/ai-implementation-executor-toolbox/SKILL.md',
    ];

    for (const templatePath of templatePaths) {
      const contents = readTemplate(templatePath);

      assert.match(contents, /selected architecture guidance/i);
      assert.match(contents, /run `sibu sync`/);
      assert.match(contents, /Do not choose|do not choose/i);
      assert.match(contents, /infer/i);
    }
  });

  it('requires downstream templates to read and apply selected architecture guidance when present', () => {
    const expectations = [
      {
        path: 'skills/software-design-writer/SKILL.md',
        patterns: [/identify and read the workflow's selected architecture skill/i, /Selected guidance and SAD boundaries are binding/i],
      },
      {
        path: 'skills/ai-implementation-planner/SKILL.md',
        patterns: [/identify and read the workflow's selected architecture skill/i, /story-local implementation step sequencing/i],
      },
      {
        path: 'skills/ai-implementation-plan-executor/SKILL.md',
        patterns: [/Pass the selected architecture skill path/i, /binding execution and review context/i],
      },
      {
        path: 'skills/ai-implementation-planner-toolbox/SKILL.md',
        patterns: [/Read required skills, the selected architecture skill/i, /Apply selected architecture guidance to story-local implementation step ordering/i],
      },
      {
        path: 'skills/ai-implementation-executor-toolbox/SKILL.md',
        patterns: [/Read the story, ordered step files, required source artifacts, required skills, the selected architecture skill/i, /Apply selected architecture guidance during implementation and review/i],
      },
    ];

    for (const expectation of expectations) {
      const contents = readTemplate(expectation.path);

      for (const pattern of expectation.patterns) {
        assert.match(contents, pattern);
      }
    }
  });
});

describe('authoring templates delegate export to dedicated exporter skills', () => {
  it('keeps document authoring templates free of Notion export workflows', () => {
    const manifest = readTemplateManifest();
    const authoringTemplatePaths = [
      'skills/business-requirements-writer/SKILL.md',
      'skills/software-design-writer/SKILL.md',
      'skills/ux-expert/SKILL.md',
    ];

    for (const templatePath of authoringTemplatePaths) {
      const contents = readTemplate(templatePath);

      assert.doesNotMatch(contents, /Optional Notion export after local write/i);
      assert.doesNotMatch(contents, /mcpServerConfigs\.notion\.docsParentPage/i);
      assert.doesNotMatch(contents, /Create a new document page for the just-written artifact content/i);
    }

  });

  it('requires embedded Mermaid without a companion output', () => {
    const contents = readTemplate('skills/software-design-writer/SKILL.md');
    assert.match(contents, /Every SDD embeds at least one explanatory Mermaid diagram/);
    assert.match(contents, /main-flow sequence diagram/);
    assert.match(contents, /explain why a sequence would misrepresent/);
    assert.doesNotMatch(contents, /tech_design_diagrams/);
  });

  it('keeps software design from directly requiring the Business Domain Model', () => {
    const contents = readTemplate('skills/software-design-writer/SKILL.md');

    assert.doesNotMatch(contents, /docs\/business-domain-model\.md/);
    assert.doesNotMatch(contents, /business-domain-model-writer/);
  });


  it('grounds SDD in SAD and BRD with planned verification', () => {
    const contents = readTemplate('skills/software-design-writer/SKILL.md');
    assert.match(contents, /docs\/architecture\.md/);
    assert.match(contents, /docs\/features\/<feature-slug>\/brd\.md/);
    assert.match(contents, /source BRD requirement IDs/);
    assert.match(contents, /Separate planned verification from commands actually run/);
    assert.match(contents, /quality strategy and concrete verification/);
    assert.match(contents, /without copying the entire SAD/);
  });

  it('adds verification expectations to Scrum planner stories without turning them into implementation plans', () => {
    const contents = readTemplate('skills/scrum-master-planner/SKILL.md');

    assert.match(contents, /## Verification Expectations/);
    assert.match(contents, /BRD, the software design quality strategy, and embedded SDD diagrams/i);
    assert.match(contents, /Acceptance Criteria stay behavior-focused/i);
    assert.match(contents, /Verification Expectations stay evidence-focused/i);
    assert.match(contents, /Validation stays command\/check-focused/i);
    assert.match(contents, /unit, acceptance\/integration, edge\/failure, and regression checks/i);
    assert.match(contents, /property\/invariant, torture\/fuzz, mutation, or manual QA only when/i);
    assert.match(contents, /Do not create dedicated test-only stories by default/i);
  });

  it('keeps Scrum planning free of the GitHub export gate', () => {
    const templatePath = 'skills/scrum-master-planner/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
    assert.doesNotMatch(contents, /Mandatory GitHub export gate/i);
    assert.doesNotMatch(contents, /GitHub export gate outcome/i);
    assert.doesNotMatch(contents, /Create GitHub Issues for these Epics and User Stories/i);
    assert.match(contents, /After writing files, final-answer with only:/i);
    assert.match(contents, /the Epic directories created or updated/i);
    assert.match(contents, /the number of Epics and User Stories/i);
  });
});

describe('template catalog source templates', () => {
  it('exports every specialist reviewer source through manifest-backed rendering', () => {
    const reviewerTemplatePaths = [
      'skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md',
      'skills/ai-implementation-technical-lead-reviewer-toolbox/SKILL.md',
      '.codex/agents/sibu-architecture-reviewer.toml',
      '.codex/agents/sibu-technical-lead-reviewer.toml',
      '.claude/agents/sibu-architecture-reviewer.md',
      '.claude/agents/sibu-technical-lead-reviewer.md',
      '.gemini/agents/sibu-architecture-reviewer.md',
      '.gemini/agents/sibu-technical-lead-reviewer.md',
    ];

    for (const templatePath of reviewerTemplatePaths) {
      assert.doesNotThrow(() => readTemplate(templatePath));

      const renderedContents = renderTemplateForSync({
        templateRelativePath: templatePath,
        currentPath: 'missing-agents.md',
        selectedLanguageSkills: [selectedTypescriptSkill],
        selectedFrameworkSkills: [selectedReactSkill],
        selectedArchitectureSkill: selectedCommandPatternSkill,
        selectedWorkflowSkills: [selectedPromptEngineeringSkill],
      });

      assert.ok(renderedContents.length > 0, `${templatePath} should render from its packaged source`);
      assert.doesNotMatch(renderedContents, /\{\{[^}]+\}\}/, `${templatePath} should not leave unresolved placeholders`);
    }
  });

  it('registers stricter React component file-boundary guidance', () => {
    const templatePath = 'skills/react/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /concise conversational response guidance/i);
    assert.match(contents, /Each React component belongs in its own nearby file by default/i);
    assert.match(contents, /Do not define helper subcomponents in a parent component file/i);
    assert.match(contents, /small, file-local, currently unreused/i);
    assert.match(contents, /not React components, do not return JSX, and do not represent a UI responsibility/i);
    assert.match(contents, /Prefer separated component files/i);
    assert.match(contents, /Avoid multiple component implementations in one parent file/i);
    assert.match(contents, /inspect every changed React file/i);
  });

  it('preserves the missing manifest entry error', () => {
    const manifest = readTemplateManifest();

    assert.throws(
      () => getTemplateVersion(manifest, 'missing-template.md'),
      /Template missing-template\.md is missing from templates\/manifest\.json\./
    );
  });
});
