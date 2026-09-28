import assert from 'node:assert/strict';
import test from 'node:test';
import { applySingleHunkDiff } from './single-hunk-diff.js';

test('zero-length old range inserts after its named source line', () => {
  assert.equal(applySingleHunkDiff('a\nc\n', 'prompt.md', '--- a/prompt.md\n+++ b/prompt.md\n@@ -1,0 +2,1 @@\n+b'), 'a\nb\nc\n');
  assert.equal(applySingleHunkDiff('a\n', 'prompt.md', '--- a/prompt.md\n+++ b/prompt.md\n@@ -0,0 +1,1 @@\n+b'), 'b\na\n');
  assert.throws(() => applySingleHunkDiff('a\n', 'prompt.md', '--- a/prompt.md\n+++ b/prompt.md\n@@ -3,0 +4,1 @@\n+b'), /outside/);
});
