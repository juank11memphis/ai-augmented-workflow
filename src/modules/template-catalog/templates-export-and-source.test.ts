import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getTemplateVersion, readTemplateManifest } from './index.js';

describe('template catalog source templates', () => {
  it('preserves the missing manifest entry error', () => {
    const manifest = readTemplateManifest();

    assert.throws(
      () => getTemplateVersion(manifest, 'missing-template.md'),
      /Template missing-template\.md is missing from templates\/manifest\.json\./,
    );
  });
});
