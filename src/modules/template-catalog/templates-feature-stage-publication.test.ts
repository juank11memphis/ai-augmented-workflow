import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

const stages = [
  { name: 'BRD', path: 'skills/business-requirements-writer/SKILL.md' },
  { name: 'UX', path: 'skills/ux-expert/SKILL.md' },
  { name: 'SDD', path: 'skills/software-design-writer/SKILL.md' },
] as const;

type Stage = (typeof stages)[number]['name'];
type Artifact = { stage: Stage; link: string };
type Feature = { id: number; link: string; artifacts: Map<Stage, Artifact> };

// Deterministic fake MCP operation trace; this is not live agent or GitHub evidence.
class FakeMcp {
  readonly trace: string[] = [];
  feature: Feature | undefined;

  constructor(existing: boolean) {
    if (existing) this.feature = { id: 42, link: 'https://example.test/issues/42', artifacts: new Map() };
  }

  findFeature(): Feature | undefined {
    this.trace.push('find Feature');
    return this.feature;
  }

  createFeature(): Feature {
    this.trace.push('create Feature');
    assert.equal(this.feature, undefined, 'must not create a duplicate Feature');
    this.feature = { id: 42, link: 'https://example.test/issues/42', artifacts: new Map() };
    return this.feature;
  }

  publish(feature: Feature, stage: Stage): void {
    this.trace.push(`publish ${stage} on ${feature.id}`);
    feature.artifacts.set(stage, { stage, link: `https://example.test/issues/42#${stage.toLowerCase()}` });
  }

  readArtifact(feature: Feature, stage: Stage): Artifact | undefined {
    this.trace.push(`read ${stage} on ${feature.id}`);
    return feature.artifacts.get(stage);
  }

  readPrerequisite(feature: Feature, stage: Stage): Artifact | undefined {
    this.trace.push(`downstream read ${stage} on ${feature.id}`);
    return feature.artifacts.get(stage);
  }
}

function publishStages(mcp: FakeMcp, confirm: boolean, downstreamAvailable = true) {
  const feature = mcp.findFeature() ?? mcp.createFeature();
  const confirmed: Artifact[] = [];
  for (const [index, { name }] of stages.entries()) {
    if (index > 0) {
      const prerequisite = confirmed.at(-1);
      if (!prerequisite || mcp.readPrerequisite(feature, prerequisite.stage)?.link !== prerequisite.link) {
        return { outcome: 'blocked', feature, confirmed };
      }
    }
    mcp.publish(feature, name);
    if (!confirm) return { outcome: 'unconfirmed', feature, confirmed };
    const artifact = mcp.readArtifact(feature, name);
    if (!artifact?.link || artifact.stage !== name) return { outcome: 'unconfirmed', feature, confirmed };
    confirmed.push(artifact);
  }
  return { outcome: downstreamAvailable ? 'published' : 'downstream-unavailable', feature, confirmed };
}

describe('Feature stage publication guidance contract (BRD REQ-03/AC-06; Story AC-02)', () => {
  it('states find-before-create, stage-complete publication, and readback-before-success in each stage', () => {
    for (const stage of stages) {
      const guidance = readTemplate(stage.path);
      assert.match(guidance, /find the intended Feature issue/i, stage.name);
      assert.match(guidance, new RegExp(`publish the completed ${stage.name}.*GitHub MCP`, 'i'), stage.name);
      assert.match(guidance, /Read back.*same issue and artifact/i, stage.name);
      assert.match(guidance, /unpublished.*draft.*durable|draft is durable/i, stage.name);
      assert.match(guidance, /user chooses/i, stage.name);
    }
  });

  it('publishes ordered BRD, UX, SDD on one new Feature, confirming identity before each next stage', () => {
    const mcp = new FakeMcp(false);
    const result = publishStages(mcp, true);
    assert.equal(result.outcome, 'published');
    assert.equal(result.feature.id, 42);
    assert.deepEqual(result.confirmed.map(artifact => artifact.stage), ['BRD', 'UX', 'SDD']);
    assert.deepEqual(mcp.trace, [
      'find Feature', 'create Feature',
      'publish BRD on 42', 'read BRD on 42',
      'downstream read BRD on 42', 'publish UX on 42', 'read UX on 42',
      'downstream read UX on 42', 'publish SDD on 42', 'read SDD on 42',
    ]);
    assert.equal(result.confirmed.every(artifact => artifact.link.includes('/issues/42#')), true);
  });

  it('reuses an existing Feature and never creates a duplicate', () => {
    const mcp = new FakeMcp(true);
    assert.equal(publishStages(mcp, true).outcome, 'published');
    assert.equal(mcp.trace[0], 'find Feature');
    assert.equal(mcp.trace.includes('create Feature'), false);
  });

  it('does not call an unpublished draft durable or read it as a downstream prerequisite', () => {
    const mcp = new FakeMcp(false);
    const result = publishStages(mcp, false);
    assert.equal(result.outcome, 'unconfirmed');
    assert.deepEqual(result.confirmed, []);
    assert.deepEqual(mcp.trace, ['find Feature', 'create Feature', 'publish BRD on 42']);
    for (const stage of stages) assert.match(readTemplate(stage.path), /stop|confirmation fails/i);
  });

  it('stops after confirmed SDD when downstream GitHub planning is unavailable, with no local Epic/Story output', () => {
    const mcp = new FakeMcp(false);
    const result = publishStages(mcp, true, false);
    assert.equal(result.outcome, 'downstream-unavailable');
    assert.equal(result.confirmed.at(-1)?.stage, 'SDD');
    assert.equal(mcp.trace.some(operation => /Epic|Story|local/.test(operation)), false);
    assert.match(readTemplate(stages[2].path), /stop without local Epic or Story substitutes/);
  });

  it('records current-version manifest notes for all three changed templates', () => {
    const manifest = readTemplateManifest();
    for (const [path, note] of [
      [stages[0].path, /Feature creation, confirmed BRD publication, and unconfirmed-write next steps/],
      [stages[1].path, /confirmed UX publication and unconfirmed-write next steps/],
      [stages[2].path, /confirmed SDD publication and unconfirmed-write next steps/],
    ] as const) {
      assert.ok(manifest.templates[path]?.version);
      assert.match(manifest.templates[path]?.changes.join(' ') ?? '', note);
    }
  });
});
