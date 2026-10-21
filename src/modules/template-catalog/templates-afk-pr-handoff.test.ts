import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const templatePath = 'skills/ai-implementation-plan-executor/SKILL.md';
const packaged = readTemplate(templatePath);
const installed = readFileSync(join(process.cwd(), '.agents', templatePath), 'utf8');
const integration = packaged.slice(packaged.indexOf('## Integrate verified Story:'), packaged.indexOf('## Verified Story metadata'));
const epicHandoff = packaged.slice(packaged.indexOf('## Present complete Epic for human review'), packaged.indexOf('## Final response behavior'));

type HostScenario = {
  name: string;
  mcpFact: 'available' | 'capability-missing' | 'unavailable' | 'stale';
  possibleMergeEffect: boolean;
  expected: 'verify-with-mcp' | 'disclose-and-read-only' | 'stop' | 'read-back-before-retry';
};

const scenarios: HostScenario[] = [
  { name: 'MCP supplies current facts', mcpFact: 'available', possibleMergeEffect: false, expected: 'verify-with-mcp' },
  { name: 'MCP lacks one read-only fact', mcpFact: 'capability-missing', possibleMergeEffect: false, expected: 'disclose-and-read-only' },
  { name: 'required fact unavailable', mcpFact: 'unavailable', possibleMergeEffect: false, expected: 'stop' },
  { name: 'required fact stale', mcpFact: 'stale', possibleMergeEffect: false, expected: 'stop' },
  { name: 'merge may have taken effect', mcpFact: 'available', possibleMergeEffect: true, expected: 'read-back-before-retry' },
];

function contractDecision(scenario: HostScenario): HostScenario['expected'] {
  if (scenario.possibleMergeEffect) return 'read-back-before-retry';
  if (scenario.mcpFact === 'unavailable' || scenario.mcpFact === 'stale') return 'stop';
  if (scenario.mcpFact === 'capability-missing') return 'disclose-and-read-only';
  return 'verify-with-mcp';
}

describe('AFK Story PR host-fact contract scenarios', () => {
  it('keeps the distributed guidance identical', () => {
    assert.equal(installed, packaged);
  });

  it('models MCP, narrow fallback, unavailable/stale facts, and possible effects', () => {
    for (const scenario of scenarios) {
      assert.equal(contractDecision(scenario), scenario.expected, scenario.name);
    }
    assert.match(integration, /Prefer configured GitHub MCP when it supplies each fact/);
    assert.match(integration, /specific read-only capability is missing, disclose it and use only the narrow read-only host query needed for that fact/);
    assert.match(integration, /failed, pending, missing, unavailable, stale, or ambiguous required check or policy fact blocks merge/);
    assert.match(integration, /read back actual PR identity, state, head\/base, merge method and Epic-head state before retry or next Story/);
  });

  it('binds all premerge gates to the current PR and preserves main-only squash authority', () => {
    assert.match(integration, /exact accepted plan identity is still current/);
    assert.match(integration, /every Task's prescribed check and each `Done when` item have evidence/);
    assert.match(integration, /actual Story-level validation passes/);
    assert.match(integration, /exact current PR identity, head commit and base branch\/head from host readback/);
    assert.match(integration, /every \*\*required\*\* host check conclusion and applicable merge-policy fact for that same head\/base/);
    assert.match(integration, /Story and Epic branch heads, PR head\/base and body, index\/worktree/);
    assert.match(integration, /main agent, never the Task executor/);
    assert.match(integration, /\*\*squash-only merge\*\*/);
    assert.match(packaged, /\*\*Do not merge the Epic PR\*\*/);
    assert.match(integration, /Never include credentials, secrets, raw private logs, or invented success/);
  });

  it('separates Epic-chain blockers from reportable host-fact gaps', () => {
    assert.match(epicHandoff, /every.*observed merged child Story PR/);
    assert.match(epicHandoff, /follow the observed integration chain through to the \*\*latest\*\* Epic branch head/);
    assert.match(epicHandoff, /Missing, duplicate, unmerged, mismatched, or out-of-order children.*stop the handoff/);
    assert.match(epicHandoff, /named Epic-level check.*name, source, head, and actual result/s);
    assert.match(epicHandoff, /unavailable host check or merge-policy fact is a verification gap to disclose in the open human Epic PR/);
    assert.match(epicHandoff, /gap alone does not prevent the PR handoff/);
  });

  it('requires a truthful open human Epic PR and no separate QA field', () => {
    assert.match(epicHandoff, /noteworthy failure attribution, reviewed repairs, unresolved stops, and residual limits/);
    assert.match(epicHandoff, /If no recovery occurred, report only actual checks/);
    assert.match(epicHandoff, /known required host-check conclusions and applicable merge-policy status.*verification gap/);
    assert.match(epicHandoff, /identity, open state, full body and every child link, actual head\/base and head commit/);
    assert.match(epicHandoff, /repair \*\*the same PR\*\* and read it back again/);
    assert.match(epicHandoff, /\*\*Do not merge the Epic PR\*\*/);
    assert.doesNotMatch(packaged, /deferred human-only QA|human-only QA prerequisite|QA remains `not performed`|blocked or deferred QA/i);
  });
});
