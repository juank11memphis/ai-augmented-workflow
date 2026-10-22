import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MANDATORY_SKILLS, SUPPORTED_AGENTS, getSkillTargetsForAgents, readTemplate, readTemplateManifest } from './index.js';

const path = 'skills/agent-guided-evals/SKILL.md';
const skill = readTemplate(path);

test('agent-guided skill selects one case or suite and allows saved-artifact diagnosis', () => {
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
  assert.match(skill, /Select the first failing or incomplete attempt/);
  assert.match(skill, /--case-offset <offset>/);
  assert.match(skill, /--case <case_id> --attempt <number>` without `--assertion`/);
  assert.match(skill, /Use `--assertion <id>` only to drill into a specific assertion/);
  assert.match(skill, /\*\*not the only evidence source\*\*/);
  assert.match(skill, /evals\/artifacts\/<suite>\/<run_id>\/run\.json/);
  assert.match(skill, /cases\/<case_id>\/<attempt>\.json/);
  assert.match(skill, /only the specific source records or raw response files referenced by that attempt/);
  assert.match(skill, /full selected artifact/);
  assert.match(skill, /reject traversal, symlinks, unexpected file types, or a locator pointing outside that run/);
  assert.match(skill, /unsafe, tracked, corrupt, or otherwise blocked artifact, stop/);
  assert.doesNotMatch(skill, /use only its bounded `failure` and `summary`/);
});

test('agent-guided skill bounds diagnosis, approval, edit scope, and focused verification', () => {
  assert.match(skill, /one active issue/);
  assert.match(skill, /likely cause, uncertainty, and concise possible fixes/);
  assert.match(skill, /blocked\/error\/interrupted\/partial runs, missing credentials, unavailable runner or judge/);
  assert.match(skill, /exact project-root paths, intended changes, rationale, and expected effect/);
  assert.match(skill, /Wait for explicit developer approval/);
  assert.match(skill, /Never edit secrets or credentials/);
  assert.match(skill, /working-tree baseline including pre-existing changes/);
  assert.match(skill, /post-edit changed-file list and delta.*approved scope/);
  assert.match(skill, /unexpected, concurrent, or indistinguishable.*stop before rerunning/);
  assert.match(skill, /request explicit authorization before any paid rerun/);
  assert.match(skill, /run the affected case \*\*once\*\*/);
  assert.match(skill, /Advance only if the fresh completed result demonstrates the active assertion passing or the incomplete execution issue resolved/);
  assert.match(skill, /reanalyze fresh evidence and wait for another approved, scoped fix/);
  assert.doesNotMatch(skill, /automatically run the affected case/);
  assert.match(skill, /blocked, partial, interrupted, error, unavailable, or uncertain rerun is not a pass/);
  assert.match(skill, /There is no Sibu CLI mutation shortcut/);
  assert.match(skill, /not.*Sibu-enforced authorization guarantee/);
});

test('agent-guided findings use a labeled conversation, plain-language problem layer, and supported fix', () => {
  const diagnosis = skill.split('## Diagnose and propose\n')[1]?.split('\n## Apply once and verify')[0] ?? '';
  const conversation = diagnosis.indexOf('**Conversation example:**');
  const problem = diagnosis.indexOf('**Problem:**');
  const fix = diagnosis.indexOf('**Proposed fix:**');
  assert.ok(conversation >= 0 && conversation < problem && problem < fix);
  assert.match(diagnosis, /labeling each actual originator.*`User:`.*`Assistant \(tested model\):`.*`Tool <name>:`/);
  assert.match(diagnosis, /Do not invent messages; if no conversation was captured, say why it is unavailable/);
  assert.match(diagnosis, /Explain the observed failure in plain language/);
  assert.match(diagnosis, /prompt\/model behavior, application\/tool, eval\/assertion, runner\/configuration\/provider, or unknown/);
  assert.match(diagnosis, /Separate observed evidence from an uncertain cause/);
  assert.match(diagnosis, /smallest evidence-supported fix in plain language.*exact project-root paths and expected effect/);
  assert.match(diagnosis, /no fix is proposed yet.*next needed evidence or user action instead of guessing/);
  assert.match(diagnosis, /Wait for explicit developer approval of that fix and those paths/);
});

test('agent-guided full-suite loop refreshes later failures and requires terminal suite verification', () => {
  assert.match(skill, /if its evidence predates an intervening edit, ask authorization for a paid refresh/);
  assert.match(skill, /select its current issue from fresh saved evidence/);
  assert.match(skill, /if the old failure disappeared, report that rather than repairing stale evidence/);
  assert.match(skill, /Each new fix needs its own explicit approval and scoped edit/);
  assert.match(skill, /ambiguous evidence, unsafe changes, or non-convergence/);
  assert.match(skill, /request explicit authorization before a paid full-suite rerun/);
  assert.match(skill, /rerun the full suite exactly as originally scoped, without `--case`/);
  assert.match(skill, /Claim suite success only from this terminal run's actual completed, passing outcome/);
  assert.match(skill, /If it fails, re-enter the same one-at-a-time loop/);
  assert.match(skill, /originally selected single case, retain the focused outcome and do not add a full-suite rerun/);
});

test('agent-guided skill and current-version sync metadata ship together', () => {
  const manifest = readTemplateManifest();
  const entry = manifest.templates[path];
  assert.match(skill, /name: agent-guided-evals/);
  assert.equal(manifest.templateVersion, '249');
  assert.equal(entry?.version, '7');
  assert.match(entry?.description ?? '', /Mandatory shared Codex and Claude Code guidance/);
  assert.deepEqual(entry?.changes, [
    'Inspects the first failing or incomplete case attempt through bounded CLI results before troubleshooting subsequent issues, with safe artifact fallback and no automatic paid reruns.',
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
  assert.equal(manifest.templateVersion, '249');
  assert.equal(manifest.templates['AGENTS.md']?.version, '56');
  assert.deepEqual(manifest.templates['AGENTS.md']?.changes, [
    'Routes existing Sibu eval runs and troubleshooting to the shared agent-guided skill while keeping eval artifact authoring separate.',
  ]);
  assert.equal(manifest.templates[path]?.version, '7');
});
