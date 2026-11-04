import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const template = 'skills/agent-guided-evals/SKILL.md';
const target = '.agents/skills/agent-guided-evals/SKILL.md';

/** Check the packed catalog and files rather than the source-tree catalog. */
export async function validatePackedAgentGuidedEvals({ installedPackageRoot }) {
  const skillPath = path.join(installedPackageRoot, 'templates', template);
  assert.ok(existsSync(skillPath), 'packed package must contain shared guided-eval skill');

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
