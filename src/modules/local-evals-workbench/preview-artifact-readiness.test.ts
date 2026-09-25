import assert from 'node:assert/strict';
import test from 'node:test';
import { mapArtifactReason } from './preview-artifact-readiness.js';
test('artifact safety outcomes remain focused in preview', () => {
  assert.equal(mapArtifactReason('not-ignored'), 'artifact-not-ignored');
  assert.equal(mapArtifactReason('tracked-artifacts'), 'artifact-tracked');
  assert.equal(mapArtifactReason('git-unavailable'), 'artifact-git-unavailable');
  assert.equal(mapArtifactReason('unverifiable-root'), 'artifact-root-unsafe');
  assert.equal(mapArtifactReason('unsafe-path'), 'artifact-root-unsafe');
  assert.equal(mapArtifactReason('unavailable'), 'artifact-unsafe');
});
