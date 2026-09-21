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

describe('structured logging template', () => {
  it('is registered, readable, and captures safe storytelling logging guidance', () => {
    const templatePath = 'skills/structured-logging/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];

    assertVersionMetadata(manifest.templateVersion, 'global template');
    assert.equal(templateMetadata?.version, '2');
    assert.match(templateMetadata?.description ?? '', /Mandatory structured logging/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /concise conversational response guidance/i);

    const contents = readTemplate(templatePath);

    assert.match(contents, /name: structured-logging/);
    assert.match(contents, /existing logging conventions first/i);
    assert.match(contents, /widely accepted logger/i);
    assert.match(contents, /structured, machine-readable logs/i);
    assert.match(contents, /operational story/i);
    assert.match(contents, /request or correlation id/i);
    assert.match(contents, /secrets, credentials, tokens/i);
    assert.match(contents, /raw personal data/i);
    assert.match(contents, /full prompts or model responses/i);
    assert.match(contents, /large user payloads/i);
    assert.match(contents, /helper or wrapper/i);
    assert.match(contents, /trivial pure logic/i);
    assert.match(contents, /noisy implementation details/i);
  });
});


describe('structured logging routing hooks', () => {
  it('routes AGENTS code-writing tasks to structured logging without duplicating policy', () => {
    const contents = readTemplate('AGENTS.md');

    const routingLine = contents.split('\n').find((line) => line.includes('structured-logging')) ?? '';

    assert.match(contents, /For any code-writing task, use `clean-code`/);
    assert.match(routingLine, /also use `structured-logging`/);
    assert.match(routingLine, /logging, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes/);
    assert.doesNotMatch(routingLine, /secrets, credentials, tokens/);
  });

  it('delegates clean-code logging details to the canonical skill', () => {
    const templatePath = 'skills/clean-code/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assert.equal(templateMetadata?.version, '8');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /500-line completion gate/i);
    assert.match(contents, /Hard source-file size gate/);
    assert.match(contents, /finish at or below 500 lines/);
    assert.match(contents, /Do not chop files mechanically/);
    assert.match(contents, /Keep operational behavior observable/);
    assert.match(contents, /Use `structured-logging` for detailed logging guidance/);
    assert.doesNotMatch(contents, /full prompts or model responses/);
  });

  it('keeps language and architecture skills as concise structured logging handoffs', () => {
    const manifest = readTemplateManifest();
    const expectations = [
      { path: 'skills/typescript/SKILL.md', version: '3', hook: /When TypeScript changes affect logs/ },
      { path: 'skills/golang/SKILL.md', version: '3', hook: /When Go changes affect logs/ },
      { path: 'skills/architecture/command-pattern/SKILL.md', version: '11', hook: /Operational Behavior Uses Structured Logging/ },
    ];

    for (const expectation of expectations) {
      const contents = readTemplate(expectation.path);
      const templateMetadata = manifest.templates[expectation.path];

      assert.equal(templateMetadata?.version, expectation.version);
      assert.match(templateMetadata?.changes.join('\n') ?? '', expectation.path.includes('command-pattern') ? /SAD|SDD/i : /concise conversational response guidance/i);
      assert.match(contents, /`structured-logging`/);
      assert.match(contents, expectation.hook);
      assert.doesNotMatch(contents, /secrets, credentials, tokens/);
    }
  });
});


describe('architecture downstream handoff templates', () => {
  it('preserves the fixed architecture catalog while requiring downstream handoff guidance', () => {
    const manifest = readTemplateManifest();

    assert.deepEqual(
      SELECTABLE_ARCHITECTURE_SKILLS.map((skill) => skill.id),
      ['ddd-hexagonal', 'command-pattern', 'layered-architecture'],
    );

    for (const skill of SELECTABLE_ARCHITECTURE_SKILLS) {
      const contents = readTemplate(skill.templateRelativePath);
      const templateMetadata = manifest.templates[skill.templateRelativePath];

      assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
      assert.match(contents, /## Downstream Sibu workflow handoff/);
      assert.match(contents, /### Technical design/);
      assert.match(contents, /### Implementation planning/);
      assert.match(contents, /### Implementation execution/);
      assert.match(contents, /### Review and compliance/);
      assert.match(contents, /Dependencies (must|should) (point|flow)|dependency (direction|flow)/i);
      assert.match(contents, /entrypoints?/i);
      assert.match(contents, /adapters?|repositories/i);
    }
  });

  it('captures DDD and Hexagonal downstream sequencing and boundaries', () => {
    const contents = readTemplate('skills/architecture/ddd-hexagonal/SKILL.md');

    assert.match(contents, /use-case-first and domain-first/i);
    assert.match(contents, /business rules and invariants in `domain\/\*\*`/i);
    assert.match(contents, /application orchestration and ports before infrastructure adapters/i);
    assert.match(contents, /wire entrypoints last/i);
    assert.match(contents, /Dependencies must point inward/i);
  });

  it('captures command-pattern downstream slice sequencing and review checks', () => {
    const contents = readTemplate('skills/architecture/command-pattern/SKILL.md');

    assert.match(contents, /Design the executable operation first/i);
    assert.match(contents, /Command and Result shape first/i);
    assert.match(contents, /Port contracts second/i);
    assert.match(contents, /Handler orchestration and business validation third/i);
    assert.match(contents, /Adapter implementations fourth/i);
    assert.match(contents, /entrypoint wiring last/i);
    assert.match(contents, /explicit Command, focused Handler, Result, and required Ports/i);
  });

  it('captures layered-architecture downstream layer ownership and review checks', () => {
    const contents = readTemplate('skills/architecture/layered-architecture/SKILL.md');

    assert.match(contents, /service responsibility first/i);
    assert.match(contents, /Business rules and workflow orchestration belong in services/i);
    assert.match(contents, /persistence details belong in repositories/i);
    assert.match(contents, /framework or transport adaptation belongs in controllers/i);
    assert.match(contents, /controller -> service -> repository/i);
    assert.match(contents, /controller-to-repository shortcuts/i);
  });
});

describe('layered architecture template', () => {
  it('is registered in the manifest and readable', () => {
    const templatePath = 'skills/architecture/layered-architecture/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];

    assert.equal(templateMetadata?.version, '4');
    assert.match(templateMetadata?.description ?? '', /Layered Architecture|lightweight architecture/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);

    const contents = readTemplate(templatePath);

    assert.match(contents, /name: layered-architecture/);
    assert.match(contents, /controllers/i);
    assert.match(contents, /services/i);
    assert.match(contents, /models/i);
    assert.match(contents, /repositories/i);
    assert.match(contents, /not the only valid meaning/i);
  });
});


describe('BRD writer raw idea source guidance', () => {
  it('keeps docs/feature-ideas.md ideas from bypassing the interview flow', () => {
    const templatePath = 'skills/business-requirements-writer/SKILL.md';
    const contents = readTemplate(templatePath);
    assert.match(contents, /docs\/feature-ideas\.md/);
    assert.match(contents, /raw\/vague input/i);
    assert.match(contents, /Do not skip the normal interview flow/i);
    assert.match(
      contents,
      /problem, target user\/scenario, business goal, MVP boundary, out-of-scope boundary, success signals, constraints, Business Domain Model fit, and Capability Coverage/,
    );
    assert.match(contents, /After the local `docs\/features\/<feature-slug>\/brd\.md` file is successfully written, remove the promoted idea from `docs\/feature-ideas\.md`/);
    assert.match(contents, /Do not delete the idea before the BRD file exists/);
  });
});

describe('BRD writer upstream coverage grounding', () => {
  it('requires Capabilities Map context and routes upstream gaps before BRD work', () => {
    const templatePath = 'skills/business-requirements-writer/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);

    assertVersionMetadata(manifest.templateVersion, 'global template');
    assert.equal(templateMetadata?.version, '2');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);
    assert.equal(manifest.templates['docs/capabilities-map.md'], undefined);

    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /docs\/capabilities-map\.md/);
    assert.doesNotMatch(contents, /BRD requires `docs\/architecture\.md`/);
    assert.match(contents, /BRD authoring does not require `docs\/architecture\.md`/);

    assert.match(contents, /product-vision-writer/);
    assert.match(contents, /business-domain-model-writer/);
    assert.match(contents, /capabilities-map-writer/);
    assert.match(contents, /BRD requires `docs\/business-domain-model\.md`/);
    assert.match(contents, /BRD requires `docs\/capabilities-map\.md`/);
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
    assert.match(contents, /Do not silently invent missing upstream foundations in the final BRD/i);
  });
});

describe('UX expert Business Domain Model grounding', () => {
  it('uses Business Domain Model source context for user-facing UX decisions', () => {
    const templatePath = 'skills/ux-expert/SKILL.md';
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[templatePath];
    const contents = readTemplate(templatePath);
    const groundingTerms = ['domain language', 'user-facing concepts', 'rules', 'states', 'workflows', 'boundaries'];

    assert.equal(templateMetadata?.version, '16');
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
    assert.equal(manifest.templates['docs/business-domain-model.md'], undefined);

    assert.match(contents, /docs\/product-vision\.md/);
    assert.match(contents, /docs\/business-domain-model\.md/);
    assert.match(contents, /docs\/features\/<feature-slug>\/brd\.md/);
    assert.match(contents, /business-domain-model-writer/);
    assert.match(contents, /Read product vision, Business Domain Model, and BRD/i);
    assert.match(contents, /product artifact such as `docs\/features\/<feature-slug>\/brd\.md` that defines goals, scope, and acceptance criteria/i);
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

    assert.equal(templateMetadata?.version, '3');
    assert.match(templateMetadata?.description ?? '', /Mandatory feature idea capture/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /BRD/i);
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

    assertVersionMetadata(manifest.templateVersion, 'global template');
    assert.equal(templateMetadata?.version, '5');
    assert.match(templateMetadata?.description ?? '', /Mandatory Capabilities Map writer/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
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

    assert.equal(templateMetadata?.version, '10');
    assert.match(templateMetadata?.description ?? '', /Mandatory Business Domain Model writer/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /SAD|SDD/i);
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

