import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const planner = readTemplate('skills/ai-implementation-planner/SKILL.md');
const executor = readTemplate('skills/ai-implementation-plan-executor/SKILL.md');
const plannerWorker = readTemplate('skills/ai-implementation-planner-toolbox/SKILL.md');
const executorWorker = readTemplate('skills/ai-implementation-executor-toolbox/SKILL.md');

describe('targeted handoff instruction contracts', () => {
  it('instructs both gatekeepers to provide verified references and full source paths', () => {
    for (const [role, guidance] of [['planner', planner], ['executor', executor]] as const) {
      assert.match(guidance, /story reference set/i, role);
      assert.match(guidance, /verify each|verify every ID/i, role);
      assert.match(guidance, /SDD headings and (embedded )?diagram(?: descriptions|s)?/i, role);
      assert.match(guidance, /module ownership and dependency constraints/i, role);
      assert.match(guidance, /required or relevant (installed )?skill paths/i, role);
      assert.match(guidance, /Epic brief, BRD, software design with embedded diagrams, and UX path when relevant/i, role);
      assert.match(guidance, /selected architecture skill path/i, role);
      assert.match(guidance, /\*\*start here\*\*/i, role);
      assert.doesNotMatch(guidance, /copy the full requirement catalog into the packet/i, role);
    }
    assert.match(planner, /standalone planner invocation, curate a fresh reference set/i);
    assert.match(planner, /accept its current source-verified reference set/i);
    assert.match(planner, /story verification expectations/i);
    assert.match(executor, /refresh it for a new story or materially changed source/i);
    assert.match(executor, /for `implementation` mode, the current source-verified story reference set/i);
    assert.match(executor, /validation evidence requirements/i);
    assert.match(executor, /Execute all unapproved step files in filename order/i);
  });

  it('instructs source discovery on uncertainty without waiving required-source gates', () => {
    for (const guidance of [planner, executor]) {
      assert.match(guidance, /full source path|full authoritative path/i);
      assert.match(guidance, /locate relevant context/i);
      assert.match(guidance, /Missing required (artifacts|sources) or selected architecture guidance.*hard.stop/i);
    }
    assert.match(planner, /Do not delegate incomplete planning work/i);
    assert.match(executor, /Do not delegate incomplete execution work/i);
  });

  it('instructs workers to preserve source authority and full-story quality', () => {
    for (const worker of [plannerWorker, executorWorker]) {
      assert.match(worker, /\*\*start here\*\*/i);
      assert.match(worker, /wider sections or complete artifacts/i);
      assert.match(worker, /authoritative BRD, SDD, SAD, and skills/i);
      assert.match(worker, /material omissions or conflicts|material inconsistency/i);
      assert.match(worker, /entire assigned story|entire authorized story/i);
      assert.match(worker, /no fixed context ceiling/i);
    }
    assert.match(plannerWorker, /verification expectations/i);
    assert.match(executorWorker, /implement and validate/i);
    assert.match(executorWorker, /### Repair mode/);
    assert.match(executorWorker, /human-authorized change list/i);
  });

  it('retains specialist, repair, approval, and commit instructions', () => {
    assert.match(executor, /Keep specialist-review and `repair` packets under their existing contracts/i);
    assert.match(executor, /human story.review packet|human review and workflow.control guarantees/i);
    assert.match(executor, /final approval metadata and commit execution remain with the main agent/i);
    assert.match(plannerWorker, /Never write production code/i);
    assert.match(executorWorker, /Never approve your own work/i);
    assert.match(executorWorker, /Never run:/i);
  });

  it('versions each distributed skill with current user-facing sync notes', () => {
    const manifest = readTemplateManifest();
    for (const name of [
      'ai-implementation-planner',
      'ai-implementation-plan-executor',
      'ai-implementation-planner-toolbox',
      'ai-implementation-executor-toolbox',
    ]) {
      const entry = manifest.templates[`skills/${name}/SKILL.md`];
      assert.ok(entry, name);
      assert.equal(entry.changes.length, 1, name);
      assert.match(entry.changes[0], /handoff|reference|context/i, name);
      const installed = readFileSync(`.agents/skills/${name}/SKILL.md`, 'utf8');
      const template = readTemplate(`skills/${name}/SKILL.md`);
      if (name.includes('toolbox')) {
        const placeholder = name.includes('planner') ? '{{PLANNER_WORKER_ROUTING}}' : '{{EXECUTOR_WORKER_ROUTING}}';
        const [prefix, suffix] = template.split(placeholder);
        assert.ok(installed.startsWith(prefix), name);
        assert.ok(installed.endsWith(suffix), name);
      } else {
        assert.equal(installed, template, name);
      }
    }
  });
});
