import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

type Stage = 'BRD' | 'UX' | 'SDD';
type Artifact = { stage: Stage; body: string; link: string };
type Readback = Artifact | 'absent' | 'unavailable' | 'conflicting';
type WriteEffect = 'confirmed' | 'timeout-persisted' | 'timeout-absent' | 'timeout-conflicting';

const stagePaths: Record<Stage, string> = {
  BRD: 'skills/business-requirements-writer/SKILL.md',
  UX: 'skills/ux-expert/SKILL.md',
  SDD: 'skills/software-design-writer/SKILL.md',
};

// Fake MCP traces contract decisions, not live agent compliance or GitHub semantics.
class FakeFeatureMcp {
  readonly trace: string[] = [];
  readonly artifacts = new Map<Stage, Artifact>();
  readonly session = new Map<Stage, Artifact>();
  readonly unpublishedDrafts = new Map<Stage, string>();
  readonly feature = { repository: 'owner/project', issue: 42 };
  cacheWrites = 0;
  halted = false;
  private readbackOverride: Readback | undefined;

  setReadback(value: Readback): void {
    this.readbackOverride = value;
  }

  load(stage: Stage): Artifact | undefined {
    const cached = this.session.get(stage);
    if (cached) return cached;
    this.trace.push(`read ${stage} from issue ${this.feature.issue}`);
    const published = this.artifacts.get(stage);
    if (published) this.session.set(stage, published);
    return published;
  }

  write(stage: Stage, effect: WriteEffect): void {
    this.trace.push(`write ${stage} on issue ${this.feature.issue}`);
    const artifact = { stage, body: `${stage} complete`, link: `https://example.test/issues/42#${stage.toLowerCase()}` };
    if (effect === 'confirmed' || effect === 'timeout-persisted') this.artifacts.set(stage, artifact);
    if (effect === 'timeout-conflicting') this.readbackOverride = 'conflicting';
  }

  readback(stage: Stage): Readback {
    this.trace.push(`readback ${stage} on issue ${this.feature.issue}`);
    return this.readbackOverride ?? this.artifacts.get(stage) ?? 'absent';
  }
}

function enterStage(mcp: FakeFeatureMcp, stage: Stage, uiImpact = true): 'ready' | 'blocked' {
  if (mcp.halted) return 'blocked';
  const required: Stage[] = stage === 'UX' ? ['BRD'] : stage === 'SDD' ? uiImpact ? ['BRD', 'UX'] : ['BRD'] : [];
  for (const prerequisite of required) {
    const artifact = mcp.load(prerequisite);
    if (!artifact || artifact.stage !== prerequisite || !artifact.link) return 'blocked';
  }
  return 'ready';
}

function publish(mcp: FakeFeatureMcp, stage: Stage, effect: WriteEffect): 'confirmed' | 'retryable' | 'blocked' {
  mcp.trace.push(`target ${mcp.feature.repository} issue ${mcp.feature.issue} ${stage}`);
  mcp.write(stage, effect);
  const readback = mcp.readback(stage);
  if (readback === 'absent') return 'retryable';
  if (typeof readback === 'string') {
    mcp.halted = true;
    return 'blocked';
  }
  if (readback.stage !== stage || readback.body !== `${stage} complete` || !readback.link) {
    mcp.halted = true;
    return 'blocked';
  }
  mcp.session.set(stage, readback);
  return 'confirmed';
}

describe('selective Feature readback guidance (BRD REQ-03/REQ-09, AC-06; Story AC-03/AC-04)', () => {
  it('states published-only session reads, no local substitute/cache, and project-local foundations', () => {
    const agents = readTemplate('AGENTS.md');
    assert.match(agents, /UX needs BRD; SDD needs BRD and UX only for UI-changing work/);
    assert.match(agents, /transient session context/);
    assert.match(agents, /Project-wide vision, domain model, capabilities map, and SAD remain repo-local/);
    assert.match(agents, /Never substitute local feature files, write an on-disk feature-artifact cache/);
    for (const stage of ['BRD', 'UX', 'SDD'] as const) {
      const guidance = readTemplate(stagePaths[stage]);
      assert.match(guidance, /on-disk feature-artifact cache/);
      assert.match(guidance, /read back exact issue and (?:BRD|UX|SDD) content, identity, and link/i);
      assert.match(guidance, /retry only (?:after|if) readback establishes absence/i);
      assert.match(guidance, /confirmed facts separately from uncertain effects|separate confirmed facts from uncertain effects|distinguish confirmed facts from uncertain effects/i);
      assert.match(guidance, /Do not log private artifact bodies, credentials, raw prompts, or large payloads/);
    }
  });

  it('blocks a missing published BRD and never treats an interrupted draft as a prerequisite', () => {
    const mcp = new FakeFeatureMcp();
    mcp.unpublishedDrafts.set('BRD', 'unpublished BRD draft');
    assert.equal(enterStage(mcp, 'UX'), 'blocked');
    assert.deepEqual(mcp.trace, ['read BRD from issue 42']);
    assert.equal(mcp.cacheWrites, 0);
    assert.match(readTemplate(stagePaths.UX), /missing, unpublished, or inconsistent/);
  });

  it('stops on a conflicting published prerequisite rather than using local content', () => {
    const mcp = new FakeFeatureMcp();
    mcp.artifacts.set('BRD', { stage: 'UX', body: 'wrong artifact', link: 'https://example.test/ux' });
    assert.equal(enterStage(mcp, 'UX'), 'blocked');
    assert.deepEqual(mcp.trace, ['read BRD from issue 42']);
    assert.equal(mcp.cacheWrites, 0);
  });

  it('reads only BRD for UX and BRD plus required UX for SDD, once per session need', () => {
    const mcp = new FakeFeatureMcp();
    assert.equal(publish(mcp, 'BRD', 'confirmed'), 'confirmed');
    mcp.trace.length = 0;
    assert.equal(enterStage(mcp, 'UX'), 'ready');
    assert.equal(enterStage(mcp, 'UX'), 'ready');
    assert.deepEqual(mcp.trace, []);
    assert.equal(publish(mcp, 'UX', 'confirmed'), 'confirmed');
    mcp.session.clear(); // a new agent session
    mcp.trace.length = 0;
    assert.equal(enterStage(mcp, 'SDD'), 'ready');
    assert.equal(enterStage(mcp, 'SDD'), 'ready');
    assert.deepEqual(mcp.trace, ['read BRD from issue 42', 'read UX from issue 42']);
    assert.equal(mcp.cacheWrites, 0);
  });

  it('does not load UX for a non-UI SDD', () => {
    const mcp = new FakeFeatureMcp();
    mcp.artifacts.set('BRD', { stage: 'BRD', body: 'BRD complete', link: 'https://example.test/brd' });
    assert.equal(enterStage(mcp, 'SDD', false), 'ready');
    assert.deepEqual(mcp.trace, ['read BRD from issue 42']);
  });

  it('reconciles timed-out create/update with confirmed readback and no duplicate write', () => {
    for (const stage of ['BRD', 'UX', 'SDD'] as const) {
      const mcp = new FakeFeatureMcp();
      assert.equal(publish(mcp, stage, 'timeout-persisted'), 'confirmed');
      assert.deepEqual(mcp.trace, [
        `target owner/project issue 42 ${stage}`,
        `write ${stage} on issue 42`,
        `readback ${stage} on issue 42`,
      ]);
      assert.equal(mcp.trace.filter(action => action.startsWith('write ')).length, 1);
    }
  });

  it('allows retry only after established absence, without advancing downstream', () => {
    const mcp = new FakeFeatureMcp();
    assert.equal(publish(mcp, 'BRD', 'timeout-absent'), 'retryable');
    assert.equal(enterStage(mcp, 'UX'), 'blocked');
    assert.deepEqual(mcp.trace.slice(0, 3), [
      'target owner/project issue 42 BRD', 'write BRD on issue 42', 'readback BRD on issue 42',
    ]);
    assert.equal(mcp.trace.filter(action => action.startsWith('write ')).length, 1);
  });

  it('stops on conflicting readback with no checkpoint, retry, or downstream advance', () => {
    const mcp = new FakeFeatureMcp();
    assert.equal(publish(mcp, 'BRD', 'timeout-conflicting'), 'blocked');
    assert.equal(enterStage(mcp, 'UX'), 'blocked');
    assert.equal(mcp.session.has('BRD'), false);
    assert.equal(mcp.trace.filter(action => action.startsWith('write ')).length, 1);
    assert.match(readTemplate('AGENTS.md'), /stop if readback is unavailable or conflicting/);
  });

  it('stops when readback itself is unavailable, preserving the uncertain effect', () => {
    const mcp = new FakeFeatureMcp();
    mcp.setReadback('unavailable');
    assert.equal(publish(mcp, 'BRD', 'timeout-persisted'), 'blocked');
    assert.equal(enterStage(mcp, 'UX'), 'blocked');
    assert.equal(mcp.artifacts.has('BRD'), true);
    assert.equal(mcp.session.has('BRD'), false);
    assert.equal(mcp.trace.filter(action => action.startsWith('write ')).length, 1);
  });

  it('records current-version user-facing sync notes for each changed template', () => {
    const manifest = readTemplateManifest();
    assert.ok(Number(manifest.templateVersion) > 0);
    for (const path of ['AGENTS.md', stagePaths.BRD, stagePaths.UX, stagePaths.SDD]) {
      assert.ok(Number(manifest.templates[path]?.version) > 0, path);
      assert.match(manifest.templates[path]?.changes.join(' ') ?? '', /published|publication|readback|read/i);
    }
  });
});
