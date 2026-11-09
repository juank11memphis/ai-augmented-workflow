import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { MANDATORY_SKILLS, SUPPORTED_AGENTS, getSkillTargetsForAgents, readTemplate, readTemplateManifest } from './index.js';

const writers = ['software-architecture-writer', 'software-design-writer'];

describe('SAD/SDD instruction contracts (static, not model behavior)', () => {


  for (const writer of writers) {
  }




});

describe('atomic SAD/SDD distribution and consumer contracts', () => {

  for (const consumer of ['scrum-master-planner', 'ai-implementation-planner', 'ai-implementation-plan-executor']) {
  }

  for (const source of ['skills/export-to-notion/SKILL.md', '.codex/agents/notion-exporter.toml', '.gemini/agents/notion-exporter.md', '.claude/agents/notion-exporter.md']) {
    it(`${source} preserves feature content and export boundaries`, () => {
      const contents = readTemplate(source);
      for (const text of ['sdd.md', 'Software Design Document', 'embedded Mermaid source', 'native rendering', 'Project SAD export is outside scope', 'opt-in', 'no-local-write']) assert.ok(contents.includes(text), text);
    });
  }
});
