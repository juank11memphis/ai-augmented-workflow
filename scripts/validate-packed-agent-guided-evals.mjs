import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const template = 'skills/agent-guided-evals/SKILL.md';
const target = '.agents/skills/agent-guided-evals/SKILL.md';

/** Check the packed catalog and files rather than the source-tree catalog. */
export async function validatePackedAgentGuidedEvals({ installedPackageRoot }) {
  const skillPath = path.join(installedPackageRoot, 'templates', template);
  const agentsPath = path.join(installedPackageRoot, 'templates/AGENTS.md');
  assert.ok(existsSync(skillPath), 'packed package must contain shared guided-eval skill');
  const skill = readFileSync(skillPath, 'utf8');
  const agents = readFileSync(agentsPath, 'utf8');
  assert.match(skill, /name: agent-guided-evals/);
  assert.match(skill, /sibu evals run <suite> --case <case_id>/);
  assert.match(skill, /sibu evals run <suite>` for all cases, without `--case` or run-wide model flags/);
  assert.match(skill, /A missing or unavailable required tested\/Judge suite default blocks the run/);
  assert.match(skill, /Select one active issue in stable suite\/case\/check order/);
  assert.match(skill, /For a completed failing attempt, prefer its first unresolved `failedAssertionIds` entry/);
  assert.match(skill, /Advance only if the fresh completed result demonstrates the active assertion passing or the incomplete execution issue resolved/);
  assert.match(skill, /if its evidence predates an intervening edit, ask authorization for a paid refresh, then run that case once/);
  assert.match(skill, /rerun the full suite exactly as originally scoped, without `--case`/);
  assert.match(skill, /Claim suite success only from this terminal run's actual completed, passing outcome/);
  assert.match(skill, /If it fails, re-enter the same one-at-a-time loop/);
  assert.match(skill, /Use `sibu evals result <suite> <run_id>` and a selected result when useful, but \*\*not as the only evidence source\*\*/);
  assert.match(agents, /run, inspect, troubleshoot, or fix an existing Sibu eval case.*use `agent-guided-evals`/);
  assert.match(agents, /create, revise, or maintain Sibu eval suites.*use `eval-authoring`/);

  const catalogPath = path.join(installedPackageRoot, 'bin/modules/template-catalog/index.js');
  const catalog = await import(pathToFileURL(catalogPath).href);
  const guided = catalog.MANDATORY_SKILLS.find((item) => item.templateRelativePath === template);
  assert.ok(guided, 'installed catalog must make guidance mandatory');
  for (const hostId of ['codex', 'claude']) {
    const host = catalog.SUPPORTED_AGENTS.find((agent) => agent.id === hostId);
    assert.ok(host, `installed catalog must support ${hostId}`);
    assert.deepEqual(catalog.getSkillTargetsForAgents(guided, [host]), [{
      templateRelativePath: template, targetRelativePath: target,
    }]);
  }
  console.log('Packed guided-eval skill and Codex/Claude mandatory routes passed.');
}
