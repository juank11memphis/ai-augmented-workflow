import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTemplate } from './index.js';
const skill = readTemplate('skills/eval-authoring/SKILL.md');
function section(name: string): string {
  const text = skill.split(`## ${name}\n`)[1];
  assert.ok(text, name);
  return text.split('\n## ')[0]!;
}


test('safety guidance preserves production isolation and separates raw artifacts from redacted diagnostics', () => {
  const safety = section('Tool and data safety');
  for (const phrase of ['before target initialization', 'eval-mode marker', 'selection', 'arguments and order', 'unexpected-response', 'Fail closed', 'never fall back', 'stop rather than modifying production files', 'synthetic or redacted', 'nearest existing real paths', 'symlink', 'without shells', 'environment names only', 'Git-ignored response artifacts', 'redact routine diagnostics', 'not an OS sandbox']) {
    assert.ok(safety.includes(phrase), phrase);
  }
});
