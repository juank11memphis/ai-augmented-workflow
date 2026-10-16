import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MANDATORY_SKILLS, SUPPORTED_AGENTS, getSkillTargetsForAgents, readTemplate, readTemplateManifest } from './index.js';

const path = 'skills/agent-guided-evals/SKILL.md';
const skill = readTemplate(path);

test('agent-guided skill uses the JSON CLI for one case or the full suite and bounded locators', () => {
  assert.match(skill, /sibu evals suites/);
  assert.match(skill, /one case or all cases/);
  assert.match(skill, /sibu evals describe <suite>` for all cases/);
  assert.match(skill, /sibu evals describe <suite> --case <case_id>/);
  assert.match(skill, /sibu evals run <suite>` for all cases, without `--case` or run-wide model flags/);
  assert.match(skill, /sibu evals run <suite> --case <case_id>` with saved choices/);
  assert.match(skill, /temporary `--model <model_id>` and `--judge <model_id>` only when applicable/);
  assert.match(skill, /missing or unavailable required tested\/Judge suite default blocks the run/);
  assert.match(skill, /One-case temporary choices never persist or become full-suite overrides/);
  assert.match(skill, /--case <case_id> --role <tested\|judge> --token <choiceToken> --set <model_id>/);
  assert.match(skill, /reset just that role to inheritance/);
  assert.match(skill, /suite tested default X.*eight on X and one on Y/);
  assert.match(skill, /unavailable case override blocks before any paid call/);
  assert.match(skill, /\*\*Replace\*\*.*\*\*Inherit\*\*/);
  assert.match(skill, /actual per-case tested\/Judge model/);
  assert.match(skill, /cases\[\]\.caseId.*attempts\[\]\.number/);
  assert.match(skill, /first unresolved failed assertion in stable suite\/case\/check order from `failedAssertionIds` with `locatorStatus: available`/);
  assert.match(skill, /source run ID and `\(caseId, attempt number, assertionId\)`/);
  assert.match(skill, /\(caseId, attempt number, assertionId\)/);
  assert.match(skill, /attempt \*\*1\*\* only/);
  assert.match(skill, /locator is absent, `unavailable`, `truncated`.*stop/);
  assert.match(skill, /sibu evals result <suite> <run_id> --case <case_id> --assertion <assertion_id>/);
  assert.match(skill, /bounded `failure` and `summary`/);
  assert.match(skill, /Do not infer IDs from suite JSON or load bulk artifacts/);
});

test('agent-guided skill bounds diagnosis, approval, edit scope, and focused verification', () => {
  assert.match(skill, /one active failed assertion/);
  assert.match(skill, /likely cause, uncertainty, and concise possible fixes/);
  assert.match(skill, /blocked\/error\/interrupted\/partial runs, missing credentials, unavailable runner or judge/);
  assert.match(skill, /exact project-root paths, intended changes, rationale, and expected effect/);
  assert.match(skill, /Wait for explicit developer approval/);
  assert.match(skill, /Never edit secrets or credentials/);
  assert.match(skill, /working-tree baseline including pre-existing changes/);
  assert.match(skill, /post-edit changed-file list and delta.*approved scope/);
  assert.match(skill, /unexpected, concurrent, or indistinguishable.*stop before rerunning/);
  assert.match(skill, /automatically run the affected case \*\*once\*\*/);
  assert.match(skill, /Advance only if the fresh completed result demonstrates that assertion passing/);
  assert.match(skill, /reanalyze its fresh bounded evidence and wait for another approved, scoped fix/);
  assert.match(skill, /blocked, partial, interrupted, error, unavailable, or uncertain rerun is not a pass/);
  assert.match(skill, /There is no Sibu CLI mutation shortcut/);
  assert.match(skill, /not.*Sibu-enforced authorization guarantee/);
});

test('agent-guided full-suite loop refreshes later failures and requires terminal suite verification', () => {
  assert.match(skill, /if its evidence predates an intervening edit, run that case once/);
  assert.match(skill, /select its current failed assertion from fresh bounded locators/);
  assert.match(skill, /if the old failure disappeared, report that rather than repairing stale evidence/);
  assert.match(skill, /Each new fix needs its own explicit approval and scoped edit/);
  assert.match(skill, /ambiguous evidence, unsafe changes, or non-convergence/);
  assert.match(skill, /rerun the full suite exactly as originally scoped, without `--case`/);
  assert.match(skill, /Claim suite success only from this terminal run's actual completed, passing outcome/);
  assert.match(skill, /If it fails, re-enter the same one-at-a-time loop/);
  assert.match(skill, /originally selected single case, retain the focused outcome and do not add a full-suite rerun/);
});

test('agent-guided skill and current-version sync metadata ship together', () => {
  const manifest = readTemplateManifest();
  const entry = manifest.templates[path];
  assert.match(skill, /name: agent-guided-evals/);
  assert.equal(manifest.templateVersion, '228');
  assert.equal(entry?.version, '4');
  assert.match(entry?.description ?? '', /Mandatory shared Codex and Claude Code guidance/);
  assert.deepEqual(entry?.changes, [
    'Guides explicit case override set/reset and unavailable-choice recovery with truthful per-case run results.',
  ]);
});

test('agent-guided skill resolves to one shared mandatory target for Codex and Claude Code', () => {
  const guided = MANDATORY_SKILLS.find((entry) => entry.templateRelativePath === path);
  assert.ok(guided);
  const codex = SUPPORTED_AGENTS.find((agent) => agent.id === 'codex');
  const claude = SUPPORTED_AGENTS.find((agent) => agent.id === 'claude');
  const gemini = SUPPORTED_AGENTS.find((agent) => agent.id === 'gemini');
  assert.ok(codex && claude && gemini);

  for (const agent of [codex, claude]) {
    assert.deepEqual(getSkillTargetsForAgents(guided, [agent]), [{
      templateRelativePath: path,
      targetRelativePath: '.agents/skills/agent-guided-evals/SKILL.md',
    }]);
  }
  assert.deepEqual(getSkillTargetsForAgents(guided, [codex, claude]), [{
    templateRelativePath: path,
    targetRelativePath: '.agents/skills/agent-guided-evals/SKILL.md',
  }]);
  assert.deepEqual(getSkillTargetsForAgents(guided, [gemini]), []);
});

test('eval troubleshooting route stays distinct from mandatory authoring and browser default', () => {
  const agents = readTemplate('AGENTS.md');
  const claude = readTemplate('CLAUDE.md');
  const authoring = MANDATORY_SKILLS.find((entry) => entry.templateRelativePath === 'skills/eval-authoring/SKILL.md');
  assert.ok(authoring);
  assert.match(agents, /create, revise, or maintain Sibu eval suites.*use `eval-authoring`/);
  assert.match(agents, /run, inspect, troubleshoot, or fix an existing Sibu eval case.*use `agent-guided-evals`/);
  assert.match(agents, /“let's work on evals,”/);
  assert.match(agents, /Keep creation or maintenance of eval artifacts with `eval-authoring`/);
  assert.match(claude, /Follow the project instructions in `AGENTS.md`/);
  assert.match(skill, /one case or all cases/);
  assert.doesNotMatch(skill, /open(?:ing)? the (?:browser|UI)/i);
});

test('unchanged AGENTS route metadata remains version 56 while the shared skill advances', () => {
  const manifest = readTemplateManifest();
  assert.equal(manifest.templateVersion, '228');
  assert.equal(manifest.templates['AGENTS.md']?.version, '56');
  assert.deepEqual(manifest.templates['AGENTS.md']?.changes, [
    'Routes existing Sibu eval runs and troubleshooting to the shared agent-guided skill while keeping eval artifact authoring separate.',
  ]);
  assert.equal(manifest.templates[path]?.version, '4');
});
