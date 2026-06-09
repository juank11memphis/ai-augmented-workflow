import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SELECTABLE_ARCHITECTURE_SKILLS,
  SELECTABLE_DATABASE_SKILLS,
  SELECTABLE_FRAMEWORK_SKILLS,
  SELECTABLE_LANGUAGE_SKILLS,
  SELECTABLE_MCP_SERVERS,
  SELECTABLE_WORKFLOW_SKILLS,
} from '../workflow-target-planning/index.js';
import { readTemplate, readTemplateManifest } from '../template-catalog/index.js';
import { renderTemplateForSync, renderWorkerToolboxRouting } from './templates.js';

const selectedTypescriptSkill = SELECTABLE_LANGUAGE_SKILLS.find((skill) => skill.id === 'typescript')!;
const selectedReactSkill = SELECTABLE_FRAMEWORK_SKILLS.find((skill) => skill.id === 'react')!;
const selectedCommandPatternSkill = SELECTABLE_ARCHITECTURE_SKILLS.find((skill) => skill.id === 'command-pattern')!;
const selectedPostgresqlSkill = SELECTABLE_DATABASE_SKILLS.find((skill) => skill.id === 'postgresql-expert')!;
const selectedPromptEngineeringSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ai-prompt-engineer-master')!;
const selectedUxSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'ux-expert')!;
const selectedGithubExportSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'export-to-github')!;
const selectedNotionExportSkill = SELECTABLE_WORKFLOW_SKILLS.find((skill) => skill.id === 'export-to-notion')!;


describe('layered architecture template', () => {
  it('is registered in the manifest and readable', () => {
    const templatePath = 'skills/architecture/layered-architecture/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];

    assert.equal(templateMetadata?.version, '1');
    assert.match(templateMetadata?.description ?? '', /Layered Architecture|lightweight architecture/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Layered Architecture/i);

    const contents = readTemplate(templatePath);

    assert.match(contents, /name: layered-architecture/);
    assert.match(contents, /controllers/i);
    assert.match(contents, /services/i);
    assert.match(contents, /models/i);
    assert.match(contents, /repositories/i);
    assert.match(contents, /not the only valid meaning/i);
  });
});


describe('feature brief writer raw idea source guidance', () => {
  it('keeps docs/feature-ideas.md ideas from bypassing the interview flow', () => {
    const templatePath = 'skills/feature-brief-writer/SKILL.md';
    const contents = readTemplate(templatePath);
    assert.match(contents, /docs\/feature-ideas\.md/);
    assert.match(contents, /raw\/vague input/i);
    assert.match(contents, /Do not skip the normal interview flow/i);
    assert.match(
      contents,
      /problem, target user\/scenario, business goal, MVP boundary, out-of-scope boundary, success signals, constraints, Business Domain Model fit, and Capability Coverage/,
    );
    assert.match(contents, /After the local `docs\/features\/<feature-slug>\/feature_brief\.md` file is successfully written, remove the promoted idea from `docs\/feature-ideas\.md`/);
    assert.match(contents, /Do not delete the idea before the feature brief file exists/);
  });
});

describe('feature brief writer upstream coverage grounding', () => {
  it('requires Capabilities Map context and routes upstream gaps before feature brief work', () => {
    const templatePath = 'skills/feature-brief-writer/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(manifest.templateVersion, '132');
    assert.equal(templateMetadata?.version, '16');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Requires docs\/capabilities-map\.md before Feature Brief work/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /hard-stop routing prompts/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Capability Coverage/i);
    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);
    assert.equal(manifest.templates['docs/capabilities-map.md'], undefined);

    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /docs\/capabilities-map\.md/);
    assert.doesNotMatch(contents, /feature brief requires `docs\/deep-module-map\.md`/);
    assert.doesNotMatch(contents, /Do not start a feature brief if .*docs\/deep-module-map\.md/s);

    assert.match(contents, /product-vision-writer/);
    assert.match(contents, /business-domain-model-writer/);
    assert.match(contents, /capabilities-map-writer/);
    assert.match(contents, /feature brief requires `docs\/business-domain-model\.md`/);
    assert.match(contents, /feature brief requires `docs\/capabilities-map\.md`/);
    assert.match(contents, /business language, domain concepts, relationships, rules, states, workflows, events, and boundaries/i);
    assert.match(contents, /Capabilities Map as the source of truth for business\/product capability coverage by subdomain/i);
    assert.match(contents, /stretch or change the Product Vision's direction, target users, boundaries, principles, trust expectations, or success signals/i);
    assert.match(contents, /missing or changed domain concepts, rules, workflows, lifecycles, events, boundaries, or core\/supporting subdomains/i);
    assert.match(contents, /fits an existing Business Domain Model subdomain but depends on a missing capability/i);
    assert.match(contents, /Use product-vision-writer to revise docs\/product-vision\.md for this feature request: <feature summary>/);
    assert.match(contents, /Use business-domain-model-writer to revise docs\/business-domain-model\.md for this feature request: <feature summary>/);
    assert.match(contents, /Use capabilities-map-writer to revise docs\/capabilities-map\.md for this feature request: <feature summary>/);
    assert.match(contents, /## Capability Coverage/);
    assert.match(contents, /Existing subdomain capabilities from docs\/capabilities-map\.md that support this feature/i);
    assert.match(contents, /Do not silently invent missing upstream foundations in the final brief/i);
  });
});

describe('UX expert Business Domain Model grounding', () => {
  it('uses Business Domain Model source context for user-facing UX decisions', () => {
    const templatePath = 'skills/ux-expert/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    const groundingTerms = ['domain language', 'user-facing concepts', 'rules', 'states', 'workflows', 'boundaries'];

    assert.equal(templateMetadata?.version, '13');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Requires docs\/business-domain-model\.md before UX work/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /language, user-facing concepts, rules, states, workflows, and boundaries/i);
    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);

    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /docs\/features\/<feature-slug>\/feature_brief\.md/);
    assert.match(contents, /business-domain-model-writer/);
    assert.match(contents, /Read product vision, Business Domain Model, and feature brief/i);
    assert.match(contents, /product artifact such as `docs\/features\/<feature-slug>\/feature_brief\.md` that defines goals, scope, and acceptance criteria/i);
    assert.doesNotMatch(contents, /implementation code/i);

    for (const groundingTerm of groundingTerms) {
      assert.match(contents, new RegExp(groundingTerm, 'i'));
    }
  });
});

describe('feature idea capture template', () => {
  it('is registered, readable, and routed as mandatory guidance', () => {
    const templatePath = 'skills/feature-idea-capture/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];

    assert.equal(templateMetadata?.version, '1');
    assert.match(templateMetadata?.description ?? '', /Mandatory feature idea capture/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /mandatory feature idea capture/i);
    assert.equal(manifest.templates['docs/feature-ideas.md'], undefined);

    const contents = readTemplate(templatePath);
    const agentsContents = readTemplate('AGENTS.md');

    assert.match(contents, /name: feature-idea-capture/);
    assert.match(contents, /docs\/feature-ideas\.md/);
    assert.match(contents, /create it on first use/i);
    assert.match(contents, /Do not interview the user before capture/i);
    assert.match(contents, /short heading and a few bullets/i);
    assert.match(agentsContents, /use `feature-idea-capture`/);
  });
});

describe('capabilities map writer template', () => {
  it('is registered, readable, and keeps the generated map project-owned', () => {
    const templatePath = 'skills/capabilities-map-writer/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(manifest.templateVersion, '132');
    assert.equal(templateMetadata?.version, '2');
    assert.match(templateMetadata?.description ?? '', /Mandatory Capabilities Map writer/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /ready-to-paste repair prompts/i);
    assert.equal(manifest.templates['docs/capabilities-map.md'], undefined);

    assert.match(contents, /name: capabilities-map-writer/);
    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /docs\/capabilities-map\.md/);
    assert.match(contents, /product-vision-writer/);
    assert.match(contents, /business-domain-model-writer/);
    assert.match(contents, /core subdomain capabilities/i);
    assert.match(contents, /supporting subdomain capabilities/i);
    assert.match(contents, /Generic \/ External Capabilities/);
    assert.match(contents, /business\/product-level/i);
    assert.match(contents, /modules, commands, services, APIs, database tables, files, classes/i);
    assert.match(contents, /user review\/correction pass/i);
    assert.match(contents, /I am clear on my end\. Are you good/i);
    assert.match(contents, /Product Vision gaps include missing or changed product purpose, target user, positioning, product boundaries, product principles, voice, trust expectations, or success signals/i);
    assert.match(contents, /Business Domain Model gaps include missing or changed core\/supporting subdomains, ubiquitous language, domain concepts, relationships, business rules, workflows, lifecycles, events, boundaries, or hard parts/i);
    assert.match(contents, /Use product-vision-writer to revise docs\/product-vision\.md before Capabilities Map work continues/);
    assert.match(contents, /Use business-domain-model-writer to revise docs\/business-domain-model\.md before Capabilities Map work continues/);
    assert.match(contents, /After docs\/product-vision\.md is updated, return to capabilities-map-writer to create or revise docs\/capabilities-map\.md/);
    assert.match(contents, /After docs\/business-domain-model\.md is updated, return to capabilities-map-writer to create or revise docs\/capabilities-map\.md/);
  });
});

describe('business domain model writer template', () => {
  it('is registered, readable, and keeps the generated model project-owned', () => {
    const templatePath = 'skills/business-domain-model-writer/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];

    assert.equal(templateMetadata?.version, '7');
    assert.match(templateMetadata?.description ?? '', /Mandatory Business Domain Model writer/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /subdomain-focused Mermaid diagram/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /core subdomains, supporting subdomains/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /external or generic domains/i);
    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);

    const contents = readTemplate(templatePath);

    assert.match(contents, /name: business-domain-model-writer/);
    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /assistant-led/i);
    assert.match(contents, /user's job is reviewer, not author/i);
    assert.match(contents, /mine Product Vision/i);
    assert.match(contents, /Ask one focused question at a time/i);
    assert.match(contents, /Never ask the user to answer a list of questions/i);
    assert.match(contents, /plain product language/i);
    assert.match(contents, /First question/i);
    assert.match(contents, /final check-in/i);
    assert.match(contents, /do not inspect implementation code by default/i);
    assert.match(contents, /Do not use existing implementation code as the source of truth/i);
    assert.match(contents, /Document Control & Context/);
    assert.match(contents, /Executive Summary \/ Purpose/);
    assert.match(contents, /Domain Scope & Boundaries/);
    assert.match(contents, /Ubiquitous Language/);
    assert.match(contents, /Terms and Definitions/);
    assert.match(contents, /Synonym Clarification/);
    assert.match(contents, /Bounded Contexts & Subdomains/);
    assert.match(contents, /Subdomains/);
    assert.match(contents, /Context Map/);
    assert.match(contents, /subdomain-focused Mermaid diagram/);
    assert.match(contents, /flowchart TB/);
    assert.match(contents, /Core Subdomains/);
    assert.match(contents, /Supporting Subdomains/);
    assert.match(contents, /Project-Owned Outputs/);
    assert.match(contents, /External \/ Generic Domains/);
    assert.match(contents, /Avoid drawing every operational relationship/);
    assert.match(contents, /Avoid database tables, class names, deployment nodes, or low-level service architecture/);
    assert.match(contents, /Domain Concepts & Conceptual Diagram/);
    assert.match(contents, /Conceptual Entities \/ Objects/);
    assert.match(contents, /Relationships & Cardinality/);
    assert.match(contents, /Domain Invariants & Business Rules/);
    assert.match(contents, /Invariants/);
    assert.match(contents, /Policies/);
    assert.match(contents, /Domain Events & Behaviors/);
    assert.match(contents, /Key Lifecycle Triggers/);
    assert.match(contents, /Out of Scope & Future Evolution/);
    assert.match(contents, /Assumptions/);
    assert.match(contents, /Known Variations \/ Debt/);
  });
});

describe('deep module map writer template', () => {
  it('requires Capabilities Map source context and keeps code alignment explicit', () => {
    const templatePath = 'skills/deep-module-map-writer/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    const discoveryTerms = [
      'domain concepts',
      'relationships',
      'lifecycles',
      'business rules',
      'workflows',
      'domain events',
      'boundaries',
      'hard parts',
      'business/product abilities',
    ];

    assert.equal(templateMetadata?.version, '7');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /docs\/capabilities-map\.md/);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /business\/product capabilities by subdomain/i);
    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);
    assert.equal(manifest.templates['docs/capabilities-map.md'], undefined);
    assert.equal(manifest.templates['docs/deep-module-map.md'], undefined);

    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /docs\/capabilities-map\.md/);
    assert.match(contents, /business-domain-model-writer/);
    assert.match(contents, /capabilities-map-writer/);
    assert.match(contents, /Deep Module Map requires `docs\/business-domain-model\.md`/);
    assert.match(contents, /Deep Module Map requires `docs\/capabilities-map\.md`/);
    assert.match(contents, /Capabilities Map as the source of truth for business\/product abilities by subdomain/i);
    assert.match(contents, /which Capabilities Map business\/product abilities need deep implementation boundaries/i);
    assert.match(contents, /Do not inspect implementation code by default/i);
    assert.match(contents, /existing code, folders, commands, screens, services, data objects, and technical layers are not the default source of truth/i);
    assert.match(contents, /explicitly asks for a code-alignment check/i);
    assert.match(contents, /only after domain-driven module boundaries are drafted/i);
    assert.match(contents, /alignment gaps, migration implications/i);

    for (const discoveryTerm of discoveryTerms) {
      assert.match(contents, new RegExp(discoveryTerm, 'i'));
    }
  });
});

describe('AGENTS.md template', () => {
  it('keeps Sibu maintenance guidance without a manual session-start doctor requirement', () => {
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates['AGENTS.md'];
    const contents = readTemplate('AGENTS.md');

    assert.equal(templateMetadata?.version, '33');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Capabilities Map as a formal pipeline stage/i);
    assert.match(contents, /`sibu doctor` is the read-only health check/i);
    assert.match(contents, /Use `sibu doctor` as a read-only workflow health check/i);
    assert.match(contents, /`sibu sync` is the post-init workflow maintenance command/i);
    assert.doesNotMatch(contents, /At the start of each session.*run `sibu doctor` once/i);
  });

  it('routes Business Domain Model requests and preserves downstream pipeline sequencing', () => {
    const manifest = readTemplateManifest();
    const contents = readTemplate('AGENTS.md');
    const routingTerms = [
      'docs/business-domain-model.md',
      'ubiquitous language',
      'domain concepts',
      'relationships',
      'rules',
      'lifecycles',
      'workflows',
      'domain events',
      'boundaries',
      'hard parts',
    ];

    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);
    assert.equal(manifest.templates['docs/capabilities-map.md'], undefined);
    assert.match(contents, /product vision -> business domain model -> capabilities map -> deep module map \/ feature brief -> technical design -> optional UX -> epics\/stories -> AI executor/);
    assert.match(contents, /Business Domain Model work sits after Product Vision and before the Capabilities Map/);
    assert.match(contents, /Deep Module Map and Feature Brief work are sibling downstream artifacts from Product Vision, Business Domain Model, and Capabilities Map/);
    assert.match(contents, /Technical Design remains downstream of both Feature Brief and Deep Module Map/);
    assert.match(contents, /Scrum planning and AI executor flows after Technical Design/);
    assert.match(contents, /Business Domain Model, `docs\/business-domain-model\.md`.*use `business-domain-model-writer`/);
    assert.match(contents, /Capabilities Map, product\/business capabilities, capability coverage by subdomain, `docs\/capabilities-map\.md`, missing capability checks, or capability gaps, use `capabilities-map-writer`/);
    assert.match(contents, /business-level feature brief, feature definition, feature scope, MVP feature boundaries, business acceptance criteria, capability coverage, or product-level feature rationale, use `feature-brief-writer`/);
    assert.doesNotMatch(contents, /feature brief after Deep Module Map work/);

    for (const routingTerm of routingTerms) {
      assert.match(contents, new RegExp(routingTerm.replaceAll('/', '\\/'), 'i'));
    }
  });
});

describe('worker toolbox routing profiles', () => {
  it('renders focused planner routing from selected implementation-relevant skills', () => {
    const contents = renderWorkerToolboxRouting({
      profile: 'planner',
      selectedLanguageSkills: [selectedTypescriptSkill],
      selectedFrameworkSkills: [selectedReactSkill],
      selectedArchitectureSkill: selectedCommandPatternSkill,
      selectedDatabaseSkills: [selectedPostgresqlSkill],
      selectedWorkflowSkills: [selectedPromptEngineeringSkill, selectedUxSkill, selectedGithubExportSkill, selectedNotionExportSkill],
    });

    assert.match(contents, /Focused planner worker routing/);
    assert.match(contents, /\.agents\/skills\/clean-code\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/react\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/command-pattern\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/postgresql-expert\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/ai-prompt-engineer-master\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/ux-expert\/SKILL\.md/);
    assert.match(contents, /distilled skill constraints/);
    assert.match(contents, /required skill path is missing/);
    assert.match(contents, /unmapped language, framework, database, or architecture pattern/);
    assert.match(contents, /plan risk/);
    assert.doesNotMatch(contents, /product vision/i);
    assert.doesNotMatch(contents, /feature brief writer/i);
    assert.doesNotMatch(contents, /export-to-github/);
    assert.doesNotMatch(contents, /export-to-notion/);
    assert.doesNotMatch(contents, /GitHub\/Notion/);
  });

  it('renders focused executor routing with Review Gate risk guidance', () => {
    const contents = renderWorkerToolboxRouting({
      profile: 'executor',
      selectedLanguageSkills: [selectedTypescriptSkill],
      selectedFrameworkSkills: [],
      selectedArchitectureSkill: undefined,
    });

    assert.match(contents, /Focused executor worker routing/);
    assert.match(contents, /editing code or running story execution/);
    assert.match(contents, /\.agents\/skills\/clean-code\/SKILL\.md/);
    assert.match(contents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(contents, /Review Gate risk/);
    assert.doesNotMatch(contents, /scrum-master-planner/);
    assert.doesNotMatch(contents, /export-to-notion/);
  });

  it('preserves full AGENTS routing while focused worker routing stays narrower', () => {
    const rendered = renderTemplateForSync({
      templateRelativePath: 'AGENTS.md',
      currentPath: 'missing-agents.md',
      selectedLanguageSkills: [selectedTypescriptSkill],
      selectedFrameworkSkills: [selectedReactSkill],
      selectedArchitectureSkill: selectedCommandPatternSkill,
    });
    const plannerRouting = renderWorkerToolboxRouting({
      profile: 'planner',
      selectedLanguageSkills: [selectedTypescriptSkill],
      selectedFrameworkSkills: [selectedReactSkill],
      selectedArchitectureSkill: selectedCommandPatternSkill,
    });

    assert.match(rendered, /For any task that changes `.ts` or `.tsx` files, also use `typescript`/);
    assert.match(rendered, /product-vision-writer/);
    assert.match(plannerRouting, /Focused planner worker routing/);
    assert.match(plannerRouting, /\.agents\/skills\/react\/SKILL\.md/);
    assert.doesNotMatch(plannerRouting, /product-vision-writer/);
  });

  it('delegates MCP config templates while preserving rendered output shape', () => {
    const rendered = renderTemplateForSync({
      templateRelativePath: 'mcp/claude/.mcp.json',
      currentPath: 'missing-agents.md',
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
      selectedMcpServers: SELECTABLE_MCP_SERVERS.filter((server) => server.id === 'github'),
    });
    const parsed = JSON.parse(rendered) as { mcpServers?: { github?: { url?: string; headers?: Record<string, string> } } };

    assert.equal(parsed.mcpServers?.github?.url, 'https://api.githubcopilot.com/mcp/');
    assert.equal(parsed.mcpServers?.github?.headers?.Authorization, 'Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}');
  });
});

describe('Sibu planner worker templates', () => {
  it('registers the planner skill as a main-agent gatekeeper', () => {
    const templatePath = 'skills/ai-implementation-planner/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(templateMetadata?.version, '17');
    assert.match(templateMetadata?.description ?? '', /planner gatekeeper/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /spawn the Sibu implementation planner sub-agent/i);
    assert.match(contents, /main-agent gatekeeper/i);
    assert.match(contents, /exactly one User Story/i);
    assert.match(contents, /technical-design-writer/);
    assert.match(contents, /ux-expert/);
    assert.match(contents, /sibu-implementation-planner/);
    assert.match(contents, /\.agents\/skills\/ai-implementation-planner-toolbox\/SKILL\.md/);
    assert.match(contents, /required skill paths/);
    assert.match(contents, /relevant optional installed skill paths/);
    assert.match(contents, /distilled skill constraints/);
    assert.match(contents, /export-to-github/);
    assert.match(contents, /export-to-notion/);
    assert.match(contents, /Inline fallback planning path/);
    assert.match(contents, /valid story-local `\.impl_plan\/` exists/);
    assert.match(contents, /planning-only/);
    assert.match(contents, /Do not pass the full main conversation context/);
  });

  it('registers and renders the planner toolbox skill', () => {
    const templatePath = 'skills/ai-implementation-planner-toolbox/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const rawContents = readTemplate(templatePath);
    const renderedContents = renderTemplateForSync({
      templateRelativePath: templatePath,
      currentPath: 'missing-agents.md',
      selectedLanguageSkills: [selectedTypescriptSkill],
      selectedFrameworkSkills: [selectedReactSkill],
      selectedArchitectureSkill: selectedCommandPatternSkill,
      selectedWorkflowSkills: [selectedPromptEngineeringSkill, selectedUxSkill, selectedGithubExportSkill, selectedNotionExportSkill],
    });

    assert.equal(templateMetadata?.version, '1');
    assert.match(templateMetadata?.description ?? '', /planner toolbox/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /focused worker routing/i);
    assert.match(rawContents, /name: ai-implementation-planner-toolbox/);
    assert.match(rawContents, /\{\{PLANNER_WORKER_ROUTING\}\}/);
    assert.match(renderedContents, /Focused planner worker routing/);
    assert.match(renderedContents, /\.agents\/skills\/clean-code\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/ux-expert\/SKILL\.md/);
    assert.doesNotMatch(renderedContents, /export-to-github/);
    assert.doesNotMatch(renderedContents, /export-to-notion/);
    assert.match(renderedContents, /exactly one User Story path/);
    assert.match(renderedContents, /<story-slug>\.impl_plan\/\*\.md/);
    assert.match(renderedContents, /# Step: <Imperative step title>/);
    assert.match(renderedContents, /Never write production code/);
    assert.match(renderedContents, /unmapped language, framework, database, or architecture pattern/);
  });

  it('registers thin target-native planner worker templates', () => {
    const manifest = readTemplateManifest();
    const templatePaths = [
      '.codex/agents/sibu-implementation-planner.toml',
      '.claude/agents/sibu-implementation-planner.md',
      '.gemini/agents/sibu-implementation-planner.md',
    ];

    for (const templatePath of templatePaths) {
      const templateMetadata = manifest.templates[templatePath];
      const contents = readTemplate(templatePath);
      const isCodexAgentTemplate = templatePath.startsWith('.codex/');

      assert.equal(templateMetadata?.version, '2');
      assert.match(templateMetadata?.description ?? '', /Sibu implementation planner worker/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', /light verbose mode guidance/i);
      assert.match(contents, /sibu-implementation-planner/);
      assert.match(contents, /narrow planner packet/);
      assert.match(contents, /planner toolbox skill/);
      assert.match(contents, /required and optional skill paths/);
      assert.match(contents, /distilled constraints/);
      assert.match(contents, /full conversation context/);
      assert.match(contents, /Plan exactly one story/);
      assert.match(contents, /Light verbose mode/);
      assert.match(contents, /Show the plan once at the beginning/);
      assert.match(contents, /Show only test failures and final test results/);
      assert.match(contents, /Never write production code/);

      if (isCodexAgentTemplate) {
        assert.match(contents, /developer_instructions =/);
        assert.doesNotMatch(contents, /^instructions =/m);
      }
    }
  });
});

describe('Sibu executor worker templates', () => {
  it('registers the executor skill as a main-agent gatekeeper', () => {
    const templatePath = 'skills/ai-implementation-plan-executor/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(templateMetadata?.version, '24');
    assert.match(templateMetadata?.description ?? '', /executor gatekeeper/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /spawn the Sibu implementation executor sub-agent/i);
    assert.match(contents, /main-agent gatekeeper/i);
    assert.match(contents, /ai-implementation-planner/);
    assert.match(contents, /sibu-implementation-executor/);
    assert.match(contents, /\.agents\/skills\/ai-implementation-executor-toolbox\/SKILL\.md/);
    assert.match(contents, /required skill paths/);
    assert.match(contents, /relevant optional installed skill paths/);
    assert.match(contents, /distilled skill constraints/);
    assert.match(contents, /export-to-github/);
    assert.match(contents, /export-to-notion/);
    assert.match(contents, /Fallback matrix/);
    assert.match(contents, /Inline compressed-context fallback/);
    assert.match(contents, /approval metadata and commit execution remain with the main agent/);
    assert.match(contents, /git commit/);
    assert.match(contents, /git stash/);
    assert.match(contents, /git reset/);
    assert.match(contents, /Feature continuation check/);
  });

  it('registers and renders the executor toolbox skill', () => {
    const templatePath = 'skills/ai-implementation-executor-toolbox/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const rawContents = readTemplate(templatePath);
    const renderedContents = renderTemplateForSync({
      templateRelativePath: templatePath,
      currentPath: 'missing-agents.md',
      selectedLanguageSkills: [selectedTypescriptSkill],
      selectedFrameworkSkills: [selectedReactSkill],
      selectedArchitectureSkill: selectedCommandPatternSkill,
      selectedWorkflowSkills: [selectedPromptEngineeringSkill, selectedUxSkill, selectedGithubExportSkill, selectedNotionExportSkill],
    });

    assert.equal(templateMetadata?.version, '1');
    assert.match(templateMetadata?.description ?? '', /executor toolbox/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Interactive Review Gate/i);
    assert.match(rawContents, /name: ai-implementation-executor-toolbox/);
    assert.match(rawContents, /\{\{EXECUTOR_WORKER_ROUTING\}\}/);
    assert.match(renderedContents, /Focused executor worker routing/);
    assert.match(renderedContents, /\.agents\/skills\/clean-code\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/ux-expert\/SKILL\.md/);
    assert.doesNotMatch(renderedContents, /export-to-github/);
    assert.doesNotMatch(renderedContents, /export-to-notion/);
    assert.match(renderedContents, /unapproved step files in filename order/i);
    assert.match(renderedContents, /Interactive Review Gate/);
    assert.match(renderedContents, /Review Gate risk/);
    assert.match(renderedContents, /git commit/);
    assert.match(renderedContents, /git stash/);
    assert.match(renderedContents, /git reset/);
    assert.match(renderedContents, /Never approve your own work/);
    assert.match(renderedContents, /Never write approval metadata/);
  });

  it('registers thin target-native executor worker templates', () => {
    const manifest = readTemplateManifest();
    const templatePaths = [
      '.codex/agents/sibu-implementation-executor.toml',
      '.claude/agents/sibu-implementation-executor.md',
      '.gemini/agents/sibu-implementation-executor.md',
    ];

    for (const templatePath of templatePaths) {
      const templateMetadata = manifest.templates[templatePath];
      const contents = readTemplate(templatePath);
      const isCodexAgentTemplate = templatePath.startsWith('.codex/');

      assert.equal(templateMetadata?.version, '2');
      assert.match(templateMetadata?.description ?? '', /Sibu implementation executor worker/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', /light verbose mode guidance/i);
      assert.match(contents, /sibu-implementation-executor/);
      assert.match(contents, /narrow executor packet/);
      assert.match(contents, /executor toolbox skill/);
      assert.match(contents, /required and optional skill paths/);
      assert.match(contents, /distilled constraints/);
      assert.match(contents, /full conversation context/);
      assert.match(contents, /Execute exactly one story plan/);
      assert.match(contents, /Light verbose mode/);
      assert.match(contents, /Show the plan once at the beginning/);
      assert.match(contents, /Show only test failures and final test results/);
      assert.match(contents, /run validation/);
      assert.match(contents, /Never approve your own work/);
      assert.match(contents, /run git commit/);
      assert.match(contents, /run git stash/);
      assert.match(contents, /run git reset/);

      if (isCodexAgentTemplate) {
        assert.match(contents, /developer_instructions =/);
        assert.doesNotMatch(contents, /^instructions =/m);
      }
    }
  });
});

describe('dedicated exporter skill templates', () => {
  it('registers and renders the GitHub exporter skill', () => {
    const templatePath = 'skills/export-to-github/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(templateMetadata?.version, '4');
    assert.match(templateMetadata?.description ?? '', /GitHub export skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /non-blocking background sub-agent/i);
    assert.match(contents, /name: export-to-github/);
    assert.match(contents, /github-exporter/);
    assert.match(contents, /clean, narrow export packet/);
    assert.match(contents, /Do not call `wait_agent`/);
    assert.match(contents, /completion will arrive via sub-agent notification/);
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

    assert.equal(templateMetadata?.version, '4');
    assert.match(templateMetadata?.description ?? '', /Notion export skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /non-blocking background sub-agent/i);
    assert.match(contents, /name: export-to-notion/);
    assert.match(contents, /notion-exporter/);
    assert.match(contents, /clean, narrow export packet/);
    assert.match(contents, /Do not call `wait_agent`/);
    assert.match(contents, /completion will arrive via sub-agent notification/);
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

      assert.equal(templateMetadata?.version, isCodexAgentTemplate ? '3' : '1');
      assert.match(templateMetadata?.description ?? '', /exporter sub-agent/i);
      assert.match(
        templateMetadata?.changes.join('\n') ?? '',
        isCodexAgentTemplate ? /missing export packet/i : /clean-context|no-local-write/i,
      );
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

    assert.equal(templateMetadata?.version, '21');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Feature Brief and Deep Module Map as sibling upstream inputs/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /newer feature briefs to omit a Deep Module section/i);
    assert.match(contents, /A Markdown feature brief at `docs\/features\/<feature-slug>\/feature_brief\.md`/);
    assert.match(contents, /`docs\/deep-module-map\.md`/);
    assert.match(contents, /Treat the Feature Brief and Deep Module Map as sibling upstream inputs/);
    assert.match(contents, /newer feature briefs may omit that section/);
    assert.match(contents, /use the approved feature scope plus `docs\/deep-module-map\.md` to identify the existing modules during technical clarification/);
    assert.doesNotMatch(contents, /Require the feature brief to name one or more existing Deep Modules/);
    assert.doesNotMatch(contents, /the feature brief, including its `## Deep Module` section/);
  });

  it('keeps Scrum planning free of the GitHub export gate', () => {
    const templatePath = 'skills/scrum-master-planner/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.match(templateMetadata?.changes.join('\n') ?? '', /dedicated exporter skills/i);
    assert.doesNotMatch(contents, /Mandatory GitHub export gate/i);
    assert.doesNotMatch(contents, /GitHub export gate outcome/i);
    assert.doesNotMatch(contents, /Create GitHub Issues for these Epics and User Stories/i);
    assert.match(contents, /After writing files, final-answer with only:/i);
    assert.match(contents, /the Epic directories created or updated/i);
    assert.match(contents, /the number of Epics and User Stories/i);
  });
});
