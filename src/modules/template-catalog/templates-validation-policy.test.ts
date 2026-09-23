import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readTemplate } from './index.js';

const TEMPLATE_PATHS = [
  'skills/ai-implementation-planner/SKILL.md',
  'skills/ai-implementation-planner-toolbox/SKILL.md',
  'skills/ai-implementation-plan-executor/SKILL.md',
  'skills/ai-implementation-executor-toolbox/SKILL.md',
] as const;

const validationPolicies = TEMPLATE_PATHS.map((templatePath) => ({
  templatePath,
  policy: extractSection(readTemplate(templatePath), 'Repository-aware validation policy'),
}));

describe('repository-aware validation policy templates', () => {
  it('keeps planner and executor guidance aligned on the four responsibilities', () => {
    for (const { templatePath, policy } of validationPolicies) {
      assert.match(policy, /proportionate focused checks/i, templatePath);
      assert.match(policy, /exactly one final validation strategy/i, templatePath);
      assert.match(policy, /smallest sufficient non-overlapping set of existing repository checks/i, templatePath);
      assert.match(policy, /distinct packaging or runtime check only when changed assets can affect/i, templatePath);
    }
  });

  it('omits aggregate-covered standalone work when an aggregate exists', () => {
    for (const { templatePath, policy } of validationPolicies) {
      assert.match(policy, /canonical aggregate exists/i, templatePath);
      assert.match(policy, /(omit|do not separately repeat) standalone checks whose responsibilities it (already )?covers/i, templatePath);
    }
  });

  it('uses only existing sufficient non-overlapping checks when no aggregate exists', () => {
    for (const { templatePath, policy } of validationPolicies) {
      assert.match(policy, /When no canonical aggregate exists/i, templatePath);
      assert.match(policy, /smallest sufficient non-overlapping set/i, templatePath);
      assert.match(policy, /Do not invent or rename checks/i, templatePath);
    }
  });

  it('includes packaging coverage only for relevant assets and retains it conservatively when uncertain', () => {
    for (const { templatePath, policy } of validationPolicies) {
      assert.match(policy, /only when changed assets can affect/i, templatePath);
      assert.match(policy, /If material relevance or coverage is uncertain, retain the distinct check/i, templatePath);
      assert.match(policy, /record the conservative rationale/i, templatePath);
    }
  });

  it('allows discovered project checks without prescribing an ecosystem or concrete command', () => {
    const forbiddenPrescriptions = [
      /`(?:pnpm|npm|yarn|bun|node|deno|tsc|pytest|cargo|gradle|mvn|dotnet)\b/i,
      /\b(?:JavaScript|TypeScript|Python|Rust|Java|React|Next\.js)\b/i,
      /\b(?:package manager|build tool)\s+(?:must|should|is required to)\b/i,
    ];

    for (const { templatePath, policy } of validationPolicies) {
      assert.match(policy, /repository-specific plans may (?:record|name) concrete checks discovered/i, templatePath);
      assert.match(policy, /technology-, ecosystem-, tool-, and concrete-command-neutral/i, templatePath);
      for (const forbidden of forbiddenPrescriptions) {
        assert.doesNotMatch(policy, forbidden, templatePath);
      }
    }
  });
});

function extractSection(contents: string, heading: string): string {
  const sectionStart = contents.indexOf(`## ${heading}`);
  assert.notEqual(sectionStart, -1, `Missing ${heading} section`);
  const nextSection = contents.indexOf('\n## ', sectionStart + heading.length + 3);
  return contents.slice(sectionStart, nextSection === -1 ? contents.length : nextSection);
}
