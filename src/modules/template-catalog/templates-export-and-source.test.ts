import assert from 'node:assert/strict';
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


const assertVersionMetadata = (version: string | undefined, label: string): void => {
  assert.equal(typeof version, 'string', `${label} version should be a string`);
  assert.match(version ?? '', /^\d+$/, `${label} version should be numeric metadata`);
};
describe('dedicated exporter skill templates', () => {
  it('registers and renders the GitHub exporter skill', () => {
    const templatePath = 'skills/export-to-github/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(templateMetadata?.version, '6');
    assert.match(templateMetadata?.description ?? '', /GitHub export skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /concise conversational response guidance/i);
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

    assert.equal(templateMetadata?.version, '6');
    assert.match(templateMetadata?.description ?? '', /Notion export skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /concise conversational response guidance/i);
    assert.match(contents, /name: export-to-notion/);
    assert.match(contents, /notion-exporter/);
    assert.match(contents, /clean, narrow export packet/);
    assert.match(contents, /Do not call `wait_agent`/);
    assert.match(contents, /completion will arrive via sub-agent notification/);
    assert.match(contents, /### Delegated workflow/);
    assert.match(contents, /### Inline fallback workflow/);
    assert.match(contents, /Use inline fallback only when delegation is unavailable or has failed and the user explicitly accepts inline fallback/);
    assert.match(contents, /feature name/i);
    assert.match(contents, /feature_brief\.md/);
    assert.match(contents, /ux\.md/);
    assert.match(contents, /technical_design\.md/);
    assert.match(contents, /Do not export Epics, User Stories, implementation plans, product vision, Deep Module Maps, or arbitrary docs/i);
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

      assert.equal(templateMetadata?.version, isCodexAgentTemplate ? '4' : '2');
      assert.match(templateMetadata?.description ?? '', /exporter sub-agent/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', /concise reporting guidance/i);
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

      assert.equal(templateMetadata?.version, '1');
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

    assert.equal(templateMetadata?.version, '5');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /concise conversational response guidance/i);
    assert.match(contents, /name: nextjs/);
    assert.match(contents, /also use `react` when that skill is installed/);
    assert.match(contents, /component responsibility, props, state ownership, or component boundaries/);
  });
});

describe('downstream selected architecture guidance gates', () => {
  it('requires downstream skill templates to hard-stop and route missing architecture repair to sibu sync', () => {
    const templatePaths = [
      'skills/technical-design-writer/SKILL.md',
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
        path: 'skills/technical-design-writer/SKILL.md',
        patterns: [/read its installed guidance/i, /design order, module\/layer boundaries, dependency direction, and concrete implementation boundaries/i],
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
      'skills/feature-brief-writer/SKILL.md',
      'skills/technical-design-writer/SKILL.md',
      'skills/ux-expert/SKILL.md',
    ];

    for (const templatePath of authoringTemplatePaths) {
      const contents = readTemplate(templatePath);

      assert.doesNotMatch(contents, /Optional Notion export after local write/i);
      assert.doesNotMatch(contents, /mcpServerConfigs\.notion\.docsParentPage/i);
      assert.doesNotMatch(contents, /Create a new document page for the just-written artifact content/i);
    }

  });

  it('requires technical design writer to create a Mermaid diagram companion', () => {
    const contents = readTemplate('skills/technical-design-writer/SKILL.md');

    assert.match(contents, /docs\/features\/<feature-slug>\/technical_design\.md/);
    assert.match(contents, /docs\/features\/<feature-slug>\/tech_design_diagrams\.md/);
    assert.match(contents, /Always create or update `docs\/features\/<feature-slug>\/tech_design_diagrams\.md` whenever creating or updating `technical_design\.md`/);
    assert.match(contents, /Mermaid only/i);
    assert.match(contents, /Do not create deployment diagrams/i);
    assert.match(contents, /non-Mermaid formats/i);
    assert.match(contents, /clarify design intent for downstream story planning and implementation/i);
    assert.match(contents, /implementation boundaries, runtime flow, and data\/state implications/i);
    assert.match(contents, /sparse, reviewable diagrams over exhaustive diagrams/i);
    assert.match(contents, /one-sentence skip rationale instead of forcing diagram theater/i);
    assert.match(contents, /High-Level Architecture Diagram/i);
    assert.match(contents, /C4 Level 2 \/ Container-style/i);
    assert.match(contents, /app\/module\/component ownership boundaries, data stores, external systems, key dependencies, and directional protocol\/payload labels/i);
    assert.match(contents, /deployment topology, hosts, replicas, and infrastructure placement out of scope/i);
    assert.match(contents, /Sequence Diagram/i);
    assert.match(contents, /sequenceDiagram/);
    assert.match(contents, /actors, command\/handler\/module calls, persistence or external calls, the main success path, and important error\/fallback branches/i);
    assert.match(contents, /Prefer one clear sequence unless multiple materially different workflows are required/i);
    assert.match(contents, /Data Model \/ State Diagram/i);
    assert.match(contents, /erDiagram/);
    assert.match(contents, /stateDiagram/i);
    assert.match(contents, /Use an ERD when entities, relationships, persistence, or ownership change/i);
    assert.match(contents, /use a state diagram when lifecycle\/status transitions matter more than schema/i);
    assert.match(contents, /core entities\/states, keys or identifiers, meaningful relationships, and meaningful transitions/i);
    assert.match(contents, /short skip rationale/i);
    assert.match(contents, /same grounding artifacts and hard stops/i);
    assert.match(contents, /ask or stop rather than inventing missing architecture, workflow, data, or state details/i);
  });

  it('keeps technical design from directly requiring the Business Domain Model', () => {
    const contents = readTemplate('skills/technical-design-writer/SKILL.md');

    assert.doesNotMatch(contents, /docs\/business-domain-model\.md/);
    assert.doesNotMatch(contents, /business-domain-model-writer/);
  });


  it('joins Feature Brief and Deep Module Map as sibling technical design inputs', () => {
    const templatePath = 'skills/technical-design-writer/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assertVersionMetadata(templateMetadata?.version, templatePath);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /quality strategy guidance/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /verification intent before downstream planning and implementation/i);
    assert.match(contents, /A Markdown feature brief at `docs\/features\/<feature-slug>\/feature_brief\.md`/);
    assert.match(contents, /`docs\/deep-module-map\.md`/);
    assert.match(contents, /language skills, framework skills, or database skills/);
    assert.match(contents, /any selected language, framework, or database skills that apply/);
    assert.match(contents, /Treat the Feature Brief and Deep Module Map as sibling upstream inputs/);
    assert.match(contents, /newer feature briefs may omit that section/);
    assert.match(contents, /use the approved feature scope plus `docs\/deep-module-map\.md` to identify the existing modules during technical clarification/);
    assert.match(contents, /## Quality Strategy/);
    assert.match(contents, /planned verification intent, not a post-implementation command log/i);
    assert.match(contents, /unit tests/i);
    assert.match(contents, /acceptance\/integration tests/i);
    assert.match(contents, /edge\/failure tests/i);
    assert.match(contents, /regression tests/i);
    assert.match(contents, /property\/invariant/i);
    assert.match(contents, /torture\/fuzz/i);
    assert.match(contents, /mutation/i);
    assert.match(contents, /manual QA/i);
    assert.match(contents, /Keep this distinct from the planned quality strategy above/i);
    assert.doesNotMatch(contents, /Require the feature brief to name one or more existing Deep Modules/);
    assert.doesNotMatch(contents, /the feature brief, including its `## Deep Module` section/);
  });


  it('adds verification expectations to Scrum planner stories without turning them into implementation plans', () => {
    const contents = readTemplate('skills/scrum-master-planner/SKILL.md');

    assert.match(contents, /## Verification Expectations/);
    assert.match(contents, /feature brief, the technical design quality strategy, and optional diagram companion context/i);
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

    assertVersionMetadata(templateMetadata?.version, templatePath);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /story-level verification expectations/i);
    assert.doesNotMatch(contents, /Mandatory GitHub export gate/i);
    assert.doesNotMatch(contents, /GitHub export gate outcome/i);
    assert.doesNotMatch(contents, /Create GitHub Issues for these Epics and User Stories/i);
    assert.match(contents, /After writing files, final-answer with only:/i);
    assert.match(contents, /the Epic directories created or updated/i);
    assert.match(contents, /the number of Epics and User Stories/i);
  });
});

describe('downstream technical design diagram companion consumption', () => {
  it('lets Scrum planning read optional diagram companion context without replacing technical design', () => {
    const contents = readTemplate('skills/scrum-master-planner/SKILL.md');

    assert.match(contents, /docs\/features\/<feature-slug>\/tech_design_diagrams\.md\s+# optional companion context; read when present and never hard-stop when absent/i);
    assert.match(contents, /If `docs\/features\/<feature-slug>\/tech_design_diagrams\.md` exists, read it as companion context/i);
    assert.match(contents, /Preserve diagram-stated implementation boundaries, runtime flows, and data\/state implications/i);
    assert.match(contents, /Do not create, regenerate, require, export, render, or treat diagrams as a replacement for `technical_design\.md`/);
    assert.match(contents, /keep `technical_design\.md` authoritative/i);
  });

  it('passes optional diagram companion context to implementation planner workers when present', () => {
    const contents = readTemplate('skills/ai-implementation-planner/SKILL.md');

    assert.match(contents, /docs\/features\/<feature-slug>\/tech_design_diagrams\.md\s+# optional companion context; verify\/pass when present and never hard-stop when absent/i);
    assert.match(contents, /verify and pass its path to the planner worker as optional companion context/i);
    assert.match(contents, /Missing diagrams are allowed for older features and must not block implementation planning/i);
    assert.match(contents, /optional tech design diagrams path when present/i);
    assert.match(contents, /preserve diagram-stated boundaries, flows, and data\/state implications without replacing `technical_design\.md`/i);
    assert.match(contents, /Do not create, regenerate, require, export, render, or treat diagrams as a replacement for `technical_design\.md`/);
  });

  it('passes optional diagram companion context to implementation executor workers when present', () => {
    const contents = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');

    assert.match(contents, /docs\/features\/<feature-slug>\/tech_design_diagrams\.md\s+# optional companion context; verify\/pass when present and never hard-stop when absent/i);
    assert.match(contents, /verify and pass its path to the executor worker as optional companion context/i);
    assert.match(contents, /Missing diagrams are allowed for older features and must not block implementation execution/i);
    assert.match(contents, /optional tech design diagrams path when present/i);
    assert.match(contents, /preserve diagram-stated boundaries, flows, and data\/state implications without replacing `technical_design\.md`/i);
    assert.match(contents, /Do not create, regenerate, require, export, render, sync, or treat diagrams as a replacement for `technical_design\.md`/);
  });

  it('tells planner and executor workers to consume included diagrams as companion context only', () => {
    const plannerToolbox = readTemplate('skills/ai-implementation-planner-toolbox/SKILL.md');
    const executorToolbox = readTemplate('skills/ai-implementation-executor-toolbox/SKILL.md');

    for (const contents of [plannerToolbox, executorToolbox]) {
      assert.match(contents, /optional tech design diagrams when present/i);
      assert.match(contents, /Optional `tech_design_diagrams\.md` context may be included when present; its absence must not block older features/i);
      assert.match(contents, /Read included `tech_design_diagrams\.md` context when the packet provides it/i);
      assert.match(contents, /Treat included diagrams as companion context/i);
      assert.match(contents, /preserve diagram-stated boundaries, flows, and data\/state implications/i);
      assert.match(contents, /`technical_design\.md` as the authoritative technical design artifact/i);
    }

    assert.match(plannerToolbox, /Never create or change .*`tech_design_diagrams\.md`/);
    assert.match(executorToolbox, /Never create, regenerate, export, render, sync, or replace `tech_design_diagrams\.md`/);
  });
});


describe('template catalog source templates', () => {
  it('registers stricter React component file-boundary guidance', () => {
    const templatePath = 'skills/react/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(templateMetadata?.version, '5');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /concise conversational response guidance/i);
    assert.match(contents, /Each React component belongs in its own nearby file by default/i);
    assert.match(contents, /Do not define helper subcomponents in a parent component file/i);
    assert.match(contents, /small, file-local, currently unreused/i);
    assert.match(contents, /not React components, do not return JSX, and do not represent a UI responsibility/i);
    assert.match(contents, /Prefer separated component files/i);
    assert.match(contents, /Avoid multiple component implementations in one parent file/i);
    assert.match(contents, /inspect every changed React file/i);
  });

  it('returns manifest-backed template versions', () => {
    const manifest = readTemplateManifest();

    assert.equal(getTemplateVersion(manifest, 'skills/business-domain-model-writer/SKILL.md'), '8');
  });

  it('preserves the missing manifest entry error', () => {
    const manifest = readTemplateManifest();

    assert.throws(
      () => getTemplateVersion(manifest, 'missing-template.md'),
      /Template missing-template\.md is missing from templates\/manifest\.json\./
    );
  });
});
