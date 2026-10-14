import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTemplate, readTemplateManifest } from './index.js';

const path = 'skills/agent-guided-evals/SKILL.md';
const skill = readTemplate(path);

test('agent-guided skill uses the real single-case JSON CLI and T00 locator', () => {
  assert.match(skill, /sibu evals suites/);
  assert.match(skill, /sibu evals describe <suite> --case <case_id>/);
  assert.match(skill, /sibu evals run <suite> --case <case_id> --model <model_id>/);
  assert.match(skill, /--judge <model_id>.*only when required/);
  assert.match(skill, /cases\[\]\.caseId.*attempts\[\]\.number/);
  assert.match(skill, /failedAssertionIds.*locatorStatus: available/);
  assert.match(skill, /\(caseId, attempt number, assertionId\)/);
  assert.match(skill, /attempt \*\*1\*\* only/);
  assert.match(skill, /locator is absent, `unavailable`, `truncated`.*stop/);
  assert.match(skill, /sibu evals result <suite> <run_id> --case <case_id> --assertion <assertion_id>/);
  assert.match(skill, /bounded `failure` and `summary`/);
  assert.match(skill, /Do not infer IDs from suite JSON or load bulk artifacts/);
});

test('agent-guided skill bounds diagnosis, approval, edit scope, and one rerun', () => {
  assert.match(skill, /Guided full-suite or multi-case troubleshooting is not available until AGE-US-03/);
  assert.match(skill, /independent CLI full-suite run-and-inspect path remains available/);
  assert.match(skill, /one active failed assertion/);
  assert.match(skill, /likely cause, uncertainty, and concise possible fixes/);
  assert.match(skill, /blocked\/error\/interrupted\/partial runs, missing credentials, unavailable runner or judge/);
  assert.match(skill, /exact project-root paths, intended changes, rationale, and expected effect/);
  assert.match(skill, /Wait for explicit developer approval/);
  assert.match(skill, /Never edit secrets or credentials/);
  assert.match(skill, /working-tree baseline including pre-existing changes/);
  assert.match(skill, /post-edit changed-file list and delta.*approved scope/);
  assert.match(skill, /unexpected, concurrent, or indistinguishable.*stop before rerunning/);
  assert.match(skill, /automatically run the same case \*\*once\*\*/);
  assert.match(skill, /wait for a new decision before any second edit/);
  assert.match(skill, /do not claim full-suite success/);
  assert.match(skill, /There is no Sibu CLI mutation shortcut/);
  assert.match(skill, /not.*Sibu-enforced authorization guarantee/);
});

test('agent-guided skill and current-version sync metadata ship together', () => {
  const manifest = readTemplateManifest();
  const entry = manifest.templates[path];
  assert.match(skill, /name: agent-guided-evals/);
  assert.equal(manifest.templateVersion, '224');
  assert.equal(entry?.version, '1');
  assert.match(entry?.description ?? '', /Mandatory shared Codex and Claude Code guidance/);
  assert.deepEqual(entry?.changes, [
    'Adds a bounded single-case eval troubleshooting workflow with explicit fix approval, safe host edits, and one focused verification rerun.',
  ]);
});
