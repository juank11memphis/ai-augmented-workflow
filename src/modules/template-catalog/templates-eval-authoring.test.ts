import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { renderMissingWorkflowFiles } from './index.js';
import {
  MANDATORY_SKILLS,
  SELECTABLE_WORKFLOW_SKILLS,
  SUPPORTED_AGENTS,
  readTemplate,
  readTemplateManifest,
} from './index.js';
import { getWorkflowTargets } from '../../support/expected-workflow-targets.js';

const ROOT_PATH = '/test-project';
const TEMPLATE_PATH = 'skills/eval-authoring/SKILL.md';
const TARGET_PATH = '.agents/skills/eval-authoring/SKILL.md';

describe('eval-authoring template registration', () => {
  it('registers eval-authoring as mandatory skill guidance for all supported agents', () => {
    const templates = MANDATORY_SKILLS.filter((skill) => skill.templateRelativePath === TEMPLATE_PATH);

    assert.equal(templates.length, 1);
    assert.deepEqual(templates[0]?.targetRelativePathsByAgent, {
      codex: TARGET_PATH,
      gemini: TARGET_PATH,
      claude: TARGET_PATH,
    });
    assert.equal(SELECTABLE_WORKFLOW_SKILLS.some((skill) => skill.templateRelativePath === TEMPLATE_PATH), false);
  });

  it('installs and renders the eval-authoring target once for Codex, Gemini, and Claude', () => {
    const targets = getWorkflowTargets(ROOT_PATH, SUPPORTED_AGENTS);
    const targetPaths = targets.map((target) => path.relative(ROOT_PATH, target.targetPath));

    assert.equal(targetPaths.filter((targetPath) => targetPath === TARGET_PATH).length, 1);

    const evalAuthoringTarget = targets.find((target) => path.relative(ROOT_PATH, target.targetPath) === TARGET_PATH);
    assert.equal(evalAuthoringTarget?.templateRelativePath, TEMPLATE_PATH);
    assert.equal(evalAuthoringTarget?.targetKind, 'skill');

    const renderedFiles = renderMissingWorkflowFiles({
      missingTargets: targets.filter((target) => path.relative(ROOT_PATH, target.targetPath) === TARGET_PATH),
      overview: 'Test project.',
      selectedLanguageSkills: [],
      selectedFrameworkSkills: [],
    });

    assert.equal(renderedFiles.length, 1);
    assert.equal(renderedFiles[0]?.targetPath, path.join(ROOT_PATH, TARGET_PATH));
    assert.match(renderedFiles[0]?.contents ?? '', /name: eval-authoring/);
  });

  it('exposes readable manifest metadata and generated AGENTS routing', () => {
    const manifest = readTemplateManifest();
    const templateMetadata = manifest.templates[TEMPLATE_PATH];
    const agentsMetadata = manifest.templates['AGENTS.md'];
    const agentsContents = readTemplate('AGENTS.md');
    assert.match(templateMetadata?.description ?? '', /Mandatory eval-authoring skill/i);
    assert.match(templateMetadata?.changes.join('\n') ?? '', /Adds mandatory eval-authoring guidance/i);
    assert.match(agentsMetadata?.changes.join('\n') ?? '', /easier to scan/i);
    assert.match(agentsContents, /use `eval-authoring`/);
    assert.match(agentsContents, /Sibu eval suites, eval definitions, fixtures, assertions\/graders, rubrics/i);
  });
});

describe('eval-authoring skill content', () => {
  it('defines purpose, trigger scope, inputs, outputs, and hard stops', () => {
    const contents = readTemplate(TEMPLATE_PATH);

    assert.match(contents, /## Purpose/);
    assert.match(contents, /expected MVP format/i);
    assert.match(contents, /## Trigger scope/);
    assert.match(contents, /Sibu eval suites or eval definitions/i);
    assert.match(contents, /## Required inputs/);
    assert.match(contents, /suite purpose and target behavior/i);
    assert.match(contents, /expected output, reference context, or rubric/i);
    assert.match(contents, /assertions or graders/i);
    assert.match(contents, /execution hook or run adapter/i);
    assert.match(contents, /## Outputs/);
    assert.match(contents, /## Hard stops and clarification/);
    assert.match(contents, /Hard-stop or ask one focused clarification/i);
  });

  it('documents Sibu MVP eval format and conventional artifacts without project-specific suites', () => {
    const contents = readTemplate(TEMPLATE_PATH);

    assert.match(contents, /## Sibu MVP eval format/);
    assert.match(contents, /suite metadata|"name"/i);
    assert.match(contents, /test case definitions|"cases"/i);
    assert.match(contents, /fixtures? or input-variable/i);
    assert.match(contents, /expected\/reference context|"expected"/i);
    assert.match(contents, /assertions\/graders|"assertions"/i);
    assert.match(contents, /run adapter|"adapter"/i);
    assert.match(contents, /artifacts\/results|"artifacts"/i);
    assert.match(contents, /evals\/\n  <suite-id>\.json/);
    assert.doesNotMatch(contents, /rpgizer/i);
  });

  it('sets negative boundaries for execution, repair, unrelated mutation, and arbitrary existing eval changes', () => {
    const contents = readTemplate(TEMPLATE_PATH);

    assert.match(contents, /Do not use this skill for ordinary product tests/i);
    assert.match(contents, /run evals or add runtime eval execution logic/i);
    assert.match(contents, /analyze failures, draft repairs, or apply approved repairs/i);
    assert.match(contents, /mutate unrelated project files/i);
    assert.match(contents, /overwrite arbitrary existing eval suites/i);
    assert.match(contents, /Do not invent hidden expectations/i);
    assert.match(contents, /Delegate eval execution, failure analysis, repair proposal drafting, and approved repair application/i);
  });
});
