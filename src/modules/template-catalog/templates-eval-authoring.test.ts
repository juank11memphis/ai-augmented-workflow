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
    assert.match(templateMetadata?.changes.join('\n') ?? '', /target confirmation and coverage approval/i);
    assert.match(agentsMetadata?.changes.join('\n') ?? '', /easier to scan/i);
    assert.match(agentsContents, /use `eval-authoring`/);
    assert.match(agentsContents, /Sibu eval suites, eval definitions, fixtures, assertions\/graders, rubrics/i);
  });
});

describe('eval-authoring skill content', () => {
  it('defines purpose, trigger scope, inputs, outputs, and hard stops', () => {
    const contents = readTemplate(TEMPLATE_PATH);

    assert.match(contents, /## Purpose/);
    assert.match(contents, /risk-based Eval Coverage Plan/i);
    assert.match(contents, /## Trigger scope/);
    assert.match(contents, /Sibu eval suites or eval definitions/i);
    assert.match(contents, /## Required inputs for generation/);
    assert.match(contents, /suite purpose and target behavior/i);
    assert.match(contents, /expected output, reference context, or rubric/i);
    assert.match(contents, /assertions or graders/i);
    assert.match(contents, /execution hook or run adapter/i);
    assert.match(contents, /## Outputs/);
    assert.match(contents, /## Hard stops and clarification/);
    assert.match(contents, /ask one focused question and stop planning that expectation or generating files/i);
  });

  it('documents version-2 eval generation and conventional artifacts without project-specific suites', () => {
    const contents = readTemplate(TEMPLATE_PATH);

    assert.match(contents, /## Generate version-2 artifacts/);
    assert.match(contents, /suite metadata|"name"/i);
    assert.match(contents, /test case definitions|"cases"/i);
    assert.match(contents, /fixtures? or input-variable/i);
    assert.match(contents, /expected\/reference context|"expected"/i);
    assert.match(contents, /deterministic assertions, custom graders/i);
    assert.match(contents, /runner/i);
    assert.match(contents, /evals\/artifacts\//i);
    assert.match(contents, /evals\/\n  <suite-id>\.json/);
    assert.doesNotMatch(contents, /rpgizer/i);
  });

  it('sets negative boundaries for execution, repair, unrelated mutation, and arbitrary existing eval changes', () => {
    const contents = readTemplate(TEMPLATE_PATH);

    assert.match(contents, /Do not use this skill for ordinary product tests/i);
    assert.match(contents, /run evals or add Sibu runtime eval execution logic/i);
    assert.match(contents, /analyze failures, draft repairs, or apply approved repairs/i);
    assert.match(contents, /mutate unrelated project files/i);
    assert.match(contents, /overwrite arbitrary existing eval suites/i);
    assert.match(contents, /Do not invent hidden expectations/i);
    assert.match(contents, /Delegate eval execution, failure analysis, repair proposal drafting, and approved repair application/i);
  });
});

describe('eval-authoring discovery and approval guidance contract', () => {
  const contents = readTemplate(TEMPLATE_PATH);

  function section(heading: string): string {
    const start = contents.indexOf(`## ${heading}\n`);
    assert.notEqual(start, -1, `Missing ${heading} section`);
    const next = contents.indexOf('\n## ', start + 1);
    return contents.slice(start, next === -1 ? undefined : next);
  }

  it('requires evidence-backed target discovery and confirmation for broad requests', () => {
    const discovery = section('Discover and confirm Evaluation Targets');
    assert.match(discovery, /For a broad request.*inspect repo-local AI integrations, prompts, tests, code, and docs/);
    assert.match(discovery, /concise list of likely targets with paths and brief evidence/);
    assert.match(discovery, /ask the user which targets and scope to evaluate/);
    assert.match(discovery, /Stop before coverage planning until the user confirms the targets/);
  });

  it('requires scoped inspection and confirmation for directly named targets', () => {
    const discovery = section('Discover and confirm Evaluation Targets');
    assert.match(discovery, /For a directly named target.*inspect that target and relevant repo evidence/);
    assert.match(discovery, /without an unnecessary broad discovery scan/);
    assert.match(discovery, /Confirm the named target and intended scope with the user/);
    assert.match(discovery, /Do not infer confirmation from the initial request/);
  });

  it('requires each coverage disposition, grading choice, simulated tools, and gap rationale', () => {
    const coverage = section('Eval Coverage Plan');
    const categories = [
      'happy path', 'edge case', 'failure', 'abuse', 'safety', 'ambiguous input',
      'malformed input', 'adversarial input', 'multi-turn behavior', 'tool behavior',
      'nondeterminism',
    ];
    for (const category of categories) {
      assert.ok(coverage.includes(category), `Missing coverage category: ${category}`);
    }
    assert.match(coverage, /covered.*not applicable.*reason.*Coverage Gap.*risk.*resolve/i);
    assert.match(coverage, /deterministic assertions for exact behavior, references for grounded expected content, or inspectable rubrics/i);
    assert.match(coverage, /simulated tool selection, arguments, order, results, errors, and unexpected responses/i);
    assert.match(coverage, /do not plan real external tool side effects/i);
    assert.match(coverage, /Do not label open-ended model behavior exhaustively covered/i);
  });

  it('separates target confirmation from coverage approval before any project-file write', () => {
    const discovery = section('Discover and confirm Evaluation Targets');
    const coverage = section('Eval Coverage Plan');
    assert.match(discovery, /Stop before coverage planning until the user confirms the targets/);
    assert.match(coverage, /approve or correct the target-specific plan/);
    assert.match(coverage, /Stop before writing any suite, runner, fixture, or other project file until the user approves the Eval Coverage Plan/);
    assert.match(coverage, /Approval of targets alone is not coverage approval/);
    assert.ok(contents.indexOf('## Discover and confirm Evaluation Targets') < contents.indexOf('## Eval Coverage Plan'));
  });

  it('stops for focused clarification rather than inventing ambiguous pass/fail criteria', () => {
    const hardStops = section('Hard stops and clarification');
    assert.match(hardStops, /If repo-owned code, prompts, tests, and docs cannot establish a meaningful expected behavior or pass\/fail criterion/);
    assert.match(hardStops, /ask one focused question and stop planning that expectation or generating files until the user clarifies it/);
    assert.match(hardStops, /Record unresolved coverage as a gap; do not invent hidden expectations/);
  });
});
