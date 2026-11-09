import assert from 'node:assert/strict';
import { it } from 'node:test';

import { readTemplate, readTemplateManifest } from './index.js';

it('keeps the plan-executor gatekeeper versioned and review-gated', () => {
  const path = 'skills/ai-implementation-plan-executor/SKILL.md';
  const manifest = readTemplateManifest();
  assert.ok(manifest.templates[path]);
  assert.match(readTemplate(path), /fresh independent/);
});
