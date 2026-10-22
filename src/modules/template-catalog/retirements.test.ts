import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { loadSkillRetirements, lookupSkillIdentity, parseSkillRetirements } from './index.js';
import { readTemplate, readTemplateManifest } from './templates.js';

function fixture() {
  return {
    schemaVersion: 1,
    retirements: [{
      id: 'former-example',
      category: 'workflow',
      explanation: 'The former example workflow is no longer supported.',
      formerTemplateRelativePath: 'skills/former-example/SKILL.md',
      formerTargetsByAgent: {
        codex: ['.agents/skills/former-example/SKILL.md'],
        gemini: ['.agents/skills/former-example/SKILL.md'],
        claude: ['.agents/skills/former-example/SKILL.md'],
      },
      generatedRoutingTargetsByAgent: {
        codex: ['AGENTS.md'],
        gemini: ['AGENTS.md', 'GEMINI.md'],
        claude: ['AGENTS.md', 'CLAUDE.md'],
      },
    }],
  };
}

describe('skill retirement catalog', () => {
  it('loads a valid empty package resource without declaring a historical retirement', () => {
    assert.deepEqual(loadSkillRetirements(), []);
    assert.deepEqual(JSON.parse(readTemplate('skill-retirements.json')), { schemaVersion: 1, retirements: [] });
    assert.deepEqual(lookupSkillIdentity('clean-code'), { status: 'active' });
    assert.deepEqual(lookupSkillIdentity('typescript'), { status: 'active' });
    for (const id of ['ai-implementation-planner-toolbox', 'ai-implementation-executor-toolbox',
      'ai-implementation-architecture-reviewer-toolbox']) {
      assert.deepEqual(lookupSkillIdentity(id), { status: 'active' });
    }
    assert.deepEqual(lookupSkillIdentity('unrecognized-old-skill'), { status: 'absent' });
  });

  it('ships a manifest-adjacent resource without making it an installed target', () => {
    const manifest = readTemplateManifest();
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { files: string[] };
    assert.equal(manifest.templateVersion, '249');
    assert.equal(manifest.templates['skill-retirements.json']?.version, '1');
    assert.match(manifest.templates['skill-retirements.json']?.changes.join(' ') ?? '', /retirement catalog/);
    assert.ok(packageJson.files.includes('templates/'));
    assert.equal(manifest.templates['skill-retirements.json']?.description.includes('not an installed project target'), true);
  });

  it('resolves fixture evidence without an old source template and retains every agent target', () => {
    const records = parseSkillRetirements(fixture());
    assert.equal(records.length, 1);
    assert.deepEqual(lookupSkillIdentity('former-example', records), { status: 'retired', retirement: records[0] });
    assert.equal(records[0]?.formerTemplateRelativePath, 'skills/former-example/SKILL.md');
    for (const agent of ['codex', 'gemini', 'claude'] as const) {
      assert.deepEqual(records[0]?.formerTargetsByAgent[agent], ['.agents/skills/former-example/SKILL.md']);
      assert.ok(records[0]?.generatedRoutingTargetsByAgent[agent].includes('AGENTS.md'));
    }
    assert.deepEqual(lookupSkillIdentity('not-in-either-catalog', records), { status: 'absent' });
  });

  it('rejects malformed records, duplicates, overlap, architecture, and unsafe paths', () => {
    assert.throws(() => parseSkillRetirements({ schemaVersion: 2, retirements: [] }), /schema/);
    const missingExplanation = fixture();
    missingExplanation.retirements[0]!.explanation = ' ';
    assert.throws(() => parseSkillRetirements(missingExplanation), /Invalid/);
    const duplicate = fixture();
    duplicate.retirements.push(structuredClone(duplicate.retirements[0]!));
    assert.throws(() => parseSkillRetirements(duplicate), /Duplicate/);
    const active = fixture();
    active.retirements[0]!.id = 'typescript';
    assert.throws(() => parseSkillRetirements(active), /Duplicate/);
    const overlappingTarget = fixture();
    overlappingTarget.retirements[0]!.formerTargetsByAgent.codex = ['.agents/skills/typescript/SKILL.md'];
    assert.throws(() => parseSkillRetirements(overlappingTarget), /Overlapping/);
    const architecture = fixture();
    architecture.retirements[0]!.id = 'command-pattern';
    assert.throws(() => parseSkillRetirements(architecture), /architecture/);
    const architecturePath = fixture();
    architecturePath.retirements[0]!.formerTemplateRelativePath = 'skills/architecture/retired/SKILL.md';
    assert.throws(() => parseSkillRetirements(architecturePath), /Invalid/);
    const unsafe = fixture();
    unsafe.retirements[0]!.formerTargetsByAgent.claude = ['../outside'];
    assert.throws(() => parseSkillRetirements(unsafe), /unsafe/);
    const unsafeRouting = fixture();
    unsafeRouting.retirements[0]!.generatedRoutingTargetsByAgent.codex = ['/outside'];
    assert.throws(() => parseSkillRetirements(unsafeRouting), /unsafe/);
    const missingAgentTarget = fixture();
    missingAgentTarget.retirements[0]!.formerTargetsByAgent.gemini = [];
    assert.throws(() => parseSkillRetirements(missingAgentTarget), /unsafe/);
    const duplicateTarget = fixture();
    duplicateTarget.retirements.push({ ...structuredClone(duplicateTarget.retirements[0]!), id: 'another-example', formerTemplateRelativePath: 'skills/another-example/SKILL.md' });
    assert.throws(() => parseSkillRetirements(duplicateTarget), /Overlapping/);
  });

  it('rejects retirement overlap with an active supplemental skill identity, template, or target', () => {
    for (const id of ['ai-implementation-planner-toolbox', 'ai-implementation-executor-toolbox',
      'ai-implementation-architecture-reviewer-toolbox']) {
      const activeId = fixture();
      activeId.retirements[0]!.id = id;
      assert.throws(() => parseSkillRetirements(activeId), /Duplicate, active/);
    }
    const activeTemplate = fixture();
    activeTemplate.retirements[0]!.formerTemplateRelativePath = 'skills/ai-implementation-planner-toolbox/SKILL.md';
    assert.throws(() => parseSkillRetirements(activeTemplate), /Duplicate, active/);
    const activeTarget = fixture();
    activeTarget.retirements[0]!.formerTargetsByAgent.codex = ['.agents/skills/ai-implementation-executor-toolbox/SKILL.md'];
    assert.throws(() => parseSkillRetirements(activeTarget), /Overlapping/);
  });
});
