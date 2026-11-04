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


});

describe('eval-authoring skill content', () => {


});

describe('eval-authoring discovery and approval guidance contract', () => {
  const contents = readTemplate(TEMPLATE_PATH);

  function section(heading: string): string {
    const start = contents.indexOf(`## ${heading}\n`);
    assert.notEqual(start, -1, `Missing ${heading} section`);
    const next = contents.indexOf('\n## ', start + 1);
    return contents.slice(start, next === -1 ? undefined : next);
  }





});
