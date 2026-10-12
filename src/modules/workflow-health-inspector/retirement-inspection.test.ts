import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SibuState } from '../../shared/types.js';
import { lookupSkillIdentity, parseSkillRetirements } from '../template-catalog/index.js';
import { inspectWorkflow } from './retirement-inspection.js';

const retirements = parseSkillRetirements({
  schemaVersion: 1,
  retirements: [{
    id: 'former-skill',
    category: 'workflow',
    explanation: 'Former guidance is no longer provided.',
    formerTemplateRelativePath: 'skills/former-skill/SKILL.md',
    formerTargetsByAgent: {
      codex: ['.agents/skills/former-skill/SKILL.md'],
      gemini: ['.agents/skills/former-skill/SKILL.md'],
      claude: ['.agents/skills/former-skill/SKILL.md'],
    },
    generatedRoutingTargetsByAgent: {
      codex: ['AGENTS.md'],
      gemini: ['AGENTS.md', 'GEMINI.md'],
      claude: ['AGENTS.md', 'CLAUDE.md'],
    },
  }],
});

function state(): SibuState {
  return {
    sibuVersion: 'test', templateVersion: 'test', generatedAt: 'test', updatedAt: 'test',
    selectedAgents: ['codex', 'gemini', 'claude'], managedFiles: {},
  };
}

function inspect(recorded: SibuState, files: Record<string, string> = {}) {
  return inspectWorkflow({ type: 'inspect-workflow' }, recorded, {
    retirements: () => retirements,
    resolveSkill: (id) => lookupSkillIdentity(id, retirements),
    exists: (relativePath) => relativePath in files,
    readText: (relativePath) => files[relativePath]!,
  }).findings;
}

function managed(template: string) {
  return { template, templateVersion: '1', sha256: 'recorded' };
}

test('finds formerly mandatory guidance without a selection and without a source template', () => {
  const recorded = state();
  recorded.managedFiles['.agents/skills/former-skill/SKILL.md'] = managed('skills/former-skill/SKILL.md');
  const findings = inspect(recorded, { '.agents/skills/former-skill/SKILL.md': 'old skill' });
  assert.deepEqual(findings, [{
    kind: 'retired-skill', skillId: 'former-skill', explanation: 'Former guidance is no longer provided.',
    evidence: [{ path: '.agents/skills/former-skill/SKILL.md', source: 'managed-file', ownership: 'managed', exists: true }],
  }]);
});

test('deduplicates a selected optional skill across agents and generated routing paths', () => {
  const recorded = state();
  recorded.selectedWorkflowSkills = ['former-skill' as 'ux-expert'];
  recorded.managedFiles['.agents/skills/former-skill/SKILL.md'] = managed('skills/former-skill/SKILL.md');
  recorded.managedFiles['AGENTS.md'] = managed('AGENTS.md');
  recorded.managedFiles['GEMINI.md'] = managed('GEMINI.md');
  const findings = inspect(recorded, {
    '.agents/skills/former-skill/SKILL.md': 'old',
    'AGENTS.md': 'Use `former-skill`.',
    'GEMINI.md': 'Use `former-skill`.',
  });
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0]?.evidence.map((item) => item.path), [
    '.sibu/state.json', '.agents/skills/former-skill/SKILL.md', 'AGENTS.md', 'GEMINI.md',
  ]);
});

test('separates an unrecognized recorded skill, excludes architecture and user-created files', () => {
  const recorded = state();
  recorded.selectedWorkflowSkills = ['unknown-skill' as 'ux-expert'];
  recorded.selectedArchitectureSkill = 'command-pattern';
  recorded.managedFiles['.agents/skills/unknown-skill/SKILL.md'] = managed('skills/unknown-skill/SKILL.md');
  recorded.managedFiles['.agents/skills/architecture/SKILL.md'] = managed('skills/architecture/retired/SKILL.md');
  const findings = inspect(recorded, {
    '.agents/skills/unknown-skill/SKILL.md': 'unknown',
    '.agents/skills/user-created/SKILL.md': 'former-skill',
  });
  assert.deepEqual(findings.map((item) => [item.kind, item.skillId]), [['unrecognized-skill', 'unknown-skill']]);
  assert.equal(findings[0]?.evidence.length, 2);
});

test('deferred evidence remains while resolved unmanaged copies and routing disappear', () => {
  const recorded = state();
  recorded.managedFiles['.agents/skills/former-skill/SKILL.md'] = managed('skills/former-skill/SKILL.md');
  assert.equal(inspect(recorded).length, 1);
  recorded.managedFiles['.agents/skills/former-skill/SKILL.md']!.status = 'unmanaged';
  assert.deepEqual(inspect(recorded, { '.agents/skills/former-skill/SKILL.md': 'preserved' }), []);
});
