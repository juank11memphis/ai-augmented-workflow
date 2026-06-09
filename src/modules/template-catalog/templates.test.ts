import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getTemplateVersion, readTemplate, readTemplateManifest } from './index.js';

describe('template catalog source templates', () => {
  it('reads and validates manifest template metadata', () => {
    const manifest = readTemplateManifest();
    const agentsTemplate = manifest.templates['AGENTS.md'];

    assert.equal(manifest.templateVersion, '132');
    assert.equal(agentsTemplate?.version, '33');
    assert.match(agentsTemplate?.description ?? '', /agent instructions/i);
    assert.match(agentsTemplate?.changes.join('\n') ?? '', /Capabilities Map as a formal pipeline stage/i);
  });

  it('reads template source contents from the source catalog', () => {
    const contents = readTemplate('skills/feature-idea-capture/SKILL.md');

    assert.match(contents, /name: feature-idea-capture/);
    assert.match(contents, /docs\/feature-ideas\.md/);
    assert.match(contents, /Do not interview the user before capture/i);
  });

  it('returns manifest-backed template versions', () => {
    const manifest = readTemplateManifest();

    assert.equal(getTemplateVersion(manifest, 'skills/business-domain-model-writer/SKILL.md'), '7');
  });

  it('preserves the missing manifest entry error', () => {
    const manifest = readTemplateManifest();

    assert.throws(
      () => getTemplateVersion(manifest, 'missing-template.md'),
      /Template missing-template\.md is missing from templates\/manifest\.json\./
    );
  });
});
