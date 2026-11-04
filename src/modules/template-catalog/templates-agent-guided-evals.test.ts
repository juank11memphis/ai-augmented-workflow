import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MANDATORY_SKILLS, SUPPORTED_AGENTS, getSkillTargetsForAgents, readTemplate, readTemplateManifest } from './index.js';

const path = 'skills/agent-guided-evals/SKILL.md';
const skill = readTemplate(path);






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
