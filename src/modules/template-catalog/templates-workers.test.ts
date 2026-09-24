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
describe('AGENTS.md template', () => {
  it('keeps Sibu maintenance guidance without a manual session-start doctor requirement', () => {
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates['AGENTS.md'];
    const contents = readTemplate('AGENTS.md');

    assert.equal(templateMetadata?.version, '42');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /sub-agent model routing/i);
    assert.match(contents, /`sibu doctor` is the read-only health check/i);
    assert.match(contents, /Use `sibu doctor` as a read-only workflow health check/i);
    assert.match(contents, /`sibu sync` is the post-init workflow maintenance command/i);
    assert.match(contents, /Answer only what the user asked/i);
    assert.match(contents, /Do not expand a request about X into adjacent topics Y and Z/i);
    assert.match(contents, /do not let brevity reduce the quality of required interviews, artifacts, safety warnings, validation details, or review gates/i);
    assert.doesNotMatch(contents, /At the start of each session.*run `sibu doctor` once/i);
  });

  it('includes judgment and honesty guidance for uncertainty and appropriate challenge', () => {
    const contents = readTemplate('AGENTS.md');

    assert.match(contents, /## Judgment and honesty/);
    assert.match(contents, /patronizing praise, performative agreement, and over-reassurance/i);
    assert.match(contents, /Do not invent certainty/i);
    assert.match(contents, /important context is missing/i);
    assert.match(contents, /state uncertainty, ask one focused question, or verify/i);
    assert.match(contents, /low-risk assumptions/i);
    assert.match(contents, /Challenge the user when there is a clear factual, safety\/security, engineering-quality, repo-instruction, product-goal, or context-reliability reason/i);
    assert.match(contents, /give a short reason and a better alternative/i);
    assert.match(contents, /preserve user control/i);
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
    assert.match(contents, /product vision -> business domain model -> capabilities map -> project SAD \/ independent feature BRD -> UX when the feature has UI impact -> software design -> epics\/stories -> AI executor/);
    assert.match(contents, /Business Domain Model work sits after Product Vision and before the Capabilities Map/);
    assert.match(contents, /Software Architecture Document and BRD work are sibling downstream artifacts from Product Vision, Business Domain Model, and Capabilities Map/);
    assert.match(contents, /UX is optional overall but required before Software Design Document when the feature has UI impact/);
    assert.match(contents, /Software Design Document remains downstream of BRD, Software Architecture Document, and required UX/);
    assert.match(contents, /Scrum planning and AI executor flows after Software Design Document/);
    assert.match(contents, /Business Domain Model, `docs\/business-domain-model\.md`.*use `business-domain-model-writer`/);
    assert.match(contents, /Capabilities Map, product\/business capabilities, capability coverage by subdomain, `docs\/capabilities-map\.md`, missing capability checks, or capability gaps, use `capabilities-map-writer`/);
    assert.match(contents, /business-level BRD, feature definition, feature scope, MVP feature boundaries, business acceptance criteria, capability coverage, or product-level feature rationale, use `business-requirements-writer`/);
    assert.doesNotMatch(contents, /BRD after Software Architecture Document work/);

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
    assert.match(contents, /Selected architecture guidance/);
    assert.match(contents, /Required: read `.agents\/skills\/command-pattern\/SKILL\.md`/);
    assert.match(contents, /binding for boundaries, dependency direction, sequencing, and reviewable constraints/);
    assert.match(contents, /run `sibu sync`/);
    assert.match(contents, /do not choose, infer, or substitute architecture guidance/i);
    assert.match(contents, /distilled skill constraints/);
    assert.match(contents, /required skill path is missing/);
    assert.match(contents, /unmapped language, framework, database, or architecture pattern/);
    assert.match(contents, /plan risk/);
    assert.doesNotMatch(contents, /product vision/i);
    assert.doesNotMatch(contents, /BRD writer/i);
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
    assert.match(contents, /\.agents\/skills\/structured-logging\/SKILL\.md/);
    assert.match(contents, /observability-relevant behavior/);
    assert.match(contents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(contents, /No selected architecture skill was provided/);
    assert.match(contents, /Hard-stop architecture-dependent executor work/);
    assert.match(contents, /run `sibu sync`/);
    assert.match(contents, /Do not choose, infer, or substitute architecture guidance/);
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

    assert.equal(templateMetadata?.version, '25');
    assert.match(templateMetadata?.description ?? '', /planner gatekeeper/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /planner spawns/i);
    assert.match(contents, /main-agent gatekeeper/i);
    assert.match(contents, /exactly one User Story/i);
    assert.match(contents, /software-design-writer/);
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
    assert.match(contents, /story verification expectations and any software design quality strategy context needed to plan validation steps/i);
    assert.match(contents, /turn verification expectations into concrete validation steps/i);
    assert.match(contents, /unit, acceptance\/integration, edge\/failure, and regression checks/i);
    assert.match(contents, /property\/invariant, torture\/fuzz, mutation, or manual QA only when/i);
    assert.match(contents, /short skip rationale/i);
    assert.match(contents, /handler\/domain validation generally precedes adapter or transport validation/i);
    assert.match(contents, /validation evidence and residual risks/i);
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

    assert.equal(templateMetadata?.version, '11');
    assert.match(templateMetadata?.description ?? '', /planner toolbox/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /repository-aware validation/i);
    assert.match(rawContents, /name: ai-implementation-planner-toolbox/);
    assert.match(rawContents, /\{\{PLANNER_WORKER_ROUTING\}\}/);
    assert.match(renderedContents, /Focused planner worker routing/);
    assert.match(renderedContents, /\.agents\/skills\/clean-code\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/ux-expert\/SKILL\.md/);
    assert.match(renderedContents, /selected architecture skill path and distilled architecture constraints/i);
    assert.match(renderedContents, /Apply selected architecture guidance to story-local implementation step ordering/i);
    assert.match(renderedContents, /run `sibu sync`/);
    assert.doesNotMatch(renderedContents, /export-to-github/);
    assert.doesNotMatch(renderedContents, /export-to-notion/);
    assert.match(renderedContents, /exactly one User Story path/);
    assert.match(renderedContents, /<story-slug>\.impl_plan\/\*\.md/);
    assert.match(renderedContents, /# Step: <Imperative step title>/);
    assert.match(renderedContents, /Never write production code/);
    assert.match(renderedContents, /unmapped language, framework, database, or architecture pattern/);
    assert.match(renderedContents, /verification expectations and any software design quality strategy context needed to plan validation steps/i);
    assert.match(renderedContents, /concrete validation steps near the work they prove/i);
    assert.match(renderedContents, /unit, acceptance\/integration, edge\/failure, regression/i);
    assert.match(renderedContents, /property\/invariant, torture\/fuzz, mutation, or manual QA/i);
    assert.match(renderedContents, /short skip rationale and residual risks/i);
    assert.match(renderedContents, /handler\/domain validation before adapter or transport validation/i);
    assert.match(renderedContents, /Validation evidence this step should create/i);
    assert.match(renderedContents, /check-touched-source-file-lines\.mjs/);
    assert.match(renderedContents, /pass\/fail evidence for the touched source-file size gate/i);
    assert.match(renderedContents, /plan explicit cohesive refactoring steps/i);
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

      assert.equal(templateMetadata?.version, '3');
      assert.match(templateMetadata?.description ?? '', /Sibu implementation planner worker/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', /concise reporting guidance/i);
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

    assert.equal(templateMetadata?.version, '38');
    assert.match(templateMetadata?.description ?? '', /executor gatekeeper/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /executor and specialist-review spawns/i);
    assert.match(contents, /main-agent gatekeeper/i);
    assert.match(contents, /ai-implementation-planner/);
    assert.match(contents, /sibu-implementation-executor/);
    assert.match(contents, /\.agents\/skills\/ai-implementation-executor-toolbox\/SKILL\.md/);
    assert.match(contents, /required skill paths/);
    assert.match(contents, /structured-logging/);
    assert.match(contents, /observability-relevant behavior/);
    assert.match(contents, /trivial pure logic/);
    assert.match(contents, /relevant optional installed skill paths/);
    assert.match(contents, /distilled skill constraints/);
    assert.match(contents, /verification expectations/i);
    assert.match(contents, /quality strategy context/i);
    assert.match(contents, /validation steps/i);
    assert.match(contents, /validation evidence requirements/i);
    assert.match(contents, /tests added or updated/i);
    assert.match(contents, /acceptance criteria verified/i);
    assert.match(contents, /edge\/failure coverage/i);
    assert.match(contents, /skipped deeper checks with rationale/i);
    assert.match(contents, /residual risks or known gaps/i);
    assert.match(contents, /tests passed.*not enough|tests passed.*not.*only completion evidence/i);
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

    assert.equal(templateMetadata?.version, '15');
    assert.match(templateMetadata?.description ?? '', /executor toolbox/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /repository-owned focused checks.*non-duplicative final strategy/i);
    assert.match(rawContents, /name: ai-implementation-executor-toolbox/);
    assert.match(rawContents, /\{\{EXECUTOR_WORKER_ROUTING\}\}/);
    assert.match(renderedContents, /Focused executor worker routing/);
    assert.match(renderedContents, /\.agents\/skills\/clean-code\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/structured-logging\/SKILL\.md/);
    assert.match(renderedContents, /observability-relevant behavior/);
    assert.match(renderedContents, /\.agents\/skills\/typescript\/SKILL\.md/);
    assert.match(renderedContents, /\.agents\/skills\/ux-expert\/SKILL\.md/);
    assert.match(renderedContents, /selected architecture skill path and distilled architecture constraints/i);
    assert.match(renderedContents, /Apply selected architecture guidance during implementation and review/i);
    assert.match(renderedContents, /run `sibu sync`/);
    assert.match(renderedContents, /verification expectations/i);
    assert.match(renderedContents, /quality strategy context/i);
    assert.match(renderedContents, /implementation-plan validation steps/i);
    assert.match(renderedContents, /Validation Evidence/i);
    assert.match(renderedContents, /tests added or updated/i);
    assert.match(renderedContents, /acceptance criteria verified/i);
    assert.match(renderedContents, /edge\/failure coverage/i);
    assert.match(renderedContents, /deeper checks performed or skipped with rationale/i);
    assert.match(renderedContents, /residual risks or known gaps/i);
    assert.match(renderedContents, /check-touched-source-file-lines\.mjs/);
    assert.match(renderedContents, /refactor touched oversized source files into cohesive focused files/i);
    assert.match(renderedContents, /file-size gate result for code-changing work/i);
    assert.match(renderedContents, /tests passed.*only completion evidence/i);
    assert.doesNotMatch(renderedContents, /export-to-github/);
    assert.doesNotMatch(renderedContents, /export-to-notion/);
    assert.match(renderedContents, /unapproved step files in filename order/i);
    assert.match(renderedContents, /Completion handoff/);
    assert.match(renderedContents, /implementation.*repair/i);
    assert.match(renderedContents, /exactly one combined review packet/i);
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

      assert.equal(templateMetadata?.version, '4');
      assert.match(templateMetadata?.description ?? '', /Sibu implementation executor worker/i);
      assert.match(templateMetadata?.changes.join('\n') ?? '', /implementation and one-packet repair modes/i);
      assert.match(contents, /sibu-implementation-executor/);
      assert.match(contents, /narrow executor packet/);
      assert.match(contents, /executor toolbox skill/);
      assert.match(contents, /required and optional skill paths/);
      assert.match(contents, /distilled constraints/);
      assert.match(contents, /full conversation context/);
      assert.match(contents, /implementation.*repair/i);
      assert.match(contents, /exactly one combined review packet/i);
      assert.match(contents, /without replanning, replaying the plan, broadening scope/i);
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
