import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { it } from 'node:test';

import { getWorkflowTargets, loadSkillRetirements, SUPPORTED_AGENTS } from './index.js';
import { readTemplateManifest } from './templates.js';
import { getTemplatesPath } from '../../shared/paths.js';

const retiredIds = [
  'scrum-master-planner-toolbox',
  'ai-implementation-planner-toolbox',
  'ai-implementation-architecture-reviewer-toolbox',
  'ai-implementation-executor-toolbox',
];

it('distributes exactly four toolbox retirements, not active targets, for every supported agent selection', () => {
  const retirements = loadSkillRetirements();
  const manifest = readTemplateManifest();
  assert.deepEqual(retirements.map(({ id }) => id), retiredIds);

  for (const retirement of retirements) {
    const formerTemplate = `skills/${retirement.id}/SKILL.md`;
    const formerTarget = `.agents/skills/${retirement.id}/SKILL.md`;
    assert.equal(retirement.category, 'mandatory');
    assert.equal(retirement.formerTemplateRelativePath, formerTemplate);
    assert.equal(manifest.templates[formerTemplate], undefined);
    assert.equal(existsSync(path.join(getTemplatesPath(), formerTemplate)), false);
    assert.match(retirement.explanation, /unchanged managed copy.*review/);
    assert.match(retirement.explanation, /customized copy as unmanaged/);
    assert.match(retirement.explanation, /user-written references.*without rewriting/);
    for (const agent of SUPPORTED_AGENTS) {
      assert.deepEqual(retirement.formerTargetsByAgent[agent.id], [formerTarget]);
      assert.deepEqual(retirement.generatedRoutingTargetsByAgent[agent.id],
        agent.id === 'codex' ? ['AGENTS.md'] :
          ['AGENTS.md', agent.id === 'gemini' ? 'GEMINI.md' : 'CLAUDE.md']);
    }
  }

  for (const selection of [...SUPPORTED_AGENTS.map((agent) => [agent]), SUPPORTED_AGENTS]) {
    const targets = getWorkflowTargets('/example-project', selection);
    const distributedTemplates = new Set(targets.map((target) => target.templateRelativePath));
    const distributedPaths = new Set(targets.map((target) => path.relative('/example-project', target.targetPath)));
    for (const id of retiredIds) {
      assert.equal(distributedTemplates.has(`skills/${id}/SKILL.md`), false);
      assert.equal(distributedPaths.has(`.agents/skills/${id}/SKILL.md`), false);
    }
    for (const id of ['clean-code', 'scrum-master-planner', 'ai-implementation-planner',
      'ai-implementation-plan-executor']) {
      assert.ok(distributedTemplates.has(`skills/${id}/SKILL.md`), `${id} remains distributed`);
    }
    for (const agent of selection) {
      const extension = agent.id === 'codex' ? 'toml' : 'md';
      const agentFolder = `.${agent.id}/agents`;
      for (const worker of ['sibu-implementation-planner', 'sibu-implementation-executor',
        'sibu-architecture-reviewer', ...(agent.id === 'codex' ? ['sibu-epic-story-planner'] : [])]) {
        assert.ok(distributedTemplates.has(`${agentFolder}/${worker}.${extension}`), `${worker} remains distributed`);
      }
    }
  }
});
