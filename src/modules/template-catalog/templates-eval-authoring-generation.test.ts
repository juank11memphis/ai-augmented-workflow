import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readTemplate } from './index.js';
const skill = readTemplate('skills/eval-authoring/SKILL.md');
function section(name: string): string {
  const text = skill.split(`## ${name}\n`)[1];
  assert.ok(text, name);
  return text.split('\n## ')[0]!;
}

test('generation is per confirmed target, versioned, real and adapted to project language', () => {
  const generation = section('Generate version-2 artifacts');
  for (const phrase of ['references/version-2-contract.md', 'version 2', 'every confirmed target', 'without silently dropping', 'language', 'clean-code', 'structured-logging', 'separate repository code-change permission', 'real target integration', 'separately selected optional Judge Model', 'fake model/judge ports', 'executing generated evals is not', 'unfamiliar framework', 'stop generation', 'placeholder runnable']) {
    assert.ok(generation.includes(phrase), phrase);
  }
  assert.doesNotMatch(skill, /Sibu MVP|\.gitkeep|implemented only when/);
});

test('safety guidance preserves production, fail-closed isolation and contained redacted evidence', () => {
  const safety = section('Tool and data safety');
  for (const phrase of ['before target initialization', 'eval-mode marker', 'selection', 'arguments and order', 'unexpected-response', 'Fail closed', 'never fall back', 'stop rather than modifying production files', 'synthetic or redacted', 'nearest existing real paths', 'symlink', 'without shells', 'environment names only', 'safe redaction is uncertain', 'not an OS sandbox']) {
    assert.ok(safety.includes(phrase), phrase);
  }
});

test('artifact exclusion, output evidence and source-control repair remain explicit', () => {
  const git = section('Conventional artifacts and Git safety');
  for (const phrase of ['/evals/artifacts/', 'without clobbering', 'effective ignore', 'no tracked artifacts', 'Missing Git', 'later negations', 'never automatically delete or untrack', 'Do not create run results', 'ordinary agent context']) assert.ok(git.includes(phrase), phrase);
  const outputs = section('Outputs');
  assert.match(outputs, /test commands\/results.*coverage summary and gaps/);
  assert.match(outputs, /dashboard version-2 execution/);
  assert.match(outputs, /Do not claim live-agent compliance/);
});
