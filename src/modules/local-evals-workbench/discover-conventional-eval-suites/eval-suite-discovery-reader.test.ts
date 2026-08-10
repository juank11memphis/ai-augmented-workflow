import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { discoverConventionalEvalSuites } from './handler.js';
import { NodeEvalSuiteDiscoveryReader } from './eval-suite-discovery-reader.js';
import type { EvalSuiteDiscoveryLogEvent, EvalSuiteDiscoveryLoggerPort } from './ports.js';

const fixturesRoot = path.join(process.cwd(), 'src/modules/local-evals-workbench/discover-conventional-eval-suites/fixtures');

describe('NodeEvalSuiteDiscoveryReader', () => {
  it('loads valid suite summaries from root evals fixtures', async () => {
    const result = await discoverFromFixture('valid-project');

    assert.equal(result.status, 'ready');
    assert.deepEqual(result.suites.map((suite) => suite.name), ['Skill authoring checks']);
    assert.deepEqual(result.suites[0]?.modelOptions.map((model) => model.id), ['gpt-5-mini', 'gpt-5']);
    assert.equal(result.suites[0]?.readyTestCaseCount, 2);
    assert.equal(result.diagnostics.length, 0);
  });

  it('reports missing evals as a blocked empty setup', async () => {
    const result = await discoverFromFixture('empty-project');

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'missing-evals-folder');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'evals-folder-missing'));
  });

  it('reports malformed JSON and malformed definitions without raw file contents', async () => {
    const result = await discoverFromFixture('malformed-project');

    assert.equal(result.status, 'blocked');
    assert.equal(result.reason, 'no-valid-eval-suites');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'suite-file-read-failed'));
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'suite-definition-malformed'));
    assert.doesNotMatch(JSON.stringify(result), /not json|OPENAI_API_KEY|secret/);
  });

  it('reports unsupported suite versions as diagnostics', async () => {
    const result = await discoverFromFixture('unsupported-project');

    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'suite-definition-unsupported'));
  });

  it('rejects traversal references and does not read outside the project root', async () => {
    const result = await discoverFromFixture('path-boundary-project');

    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'fixture-reference-unsafe'));
    assert.doesNotMatch(JSON.stringify(result), /do not read|outside-secret/);
  });

  it('rejects evals symlink escapes outside the project root', async () => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-boundary-'));
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-outside-'));
    await fs.mkdir(path.join(outsideRoot, 'evals'));
    await fs.writeFile(path.join(outsideRoot, 'evals', 'outside.json'), JSON.stringify(validSuitePayload()));
    await fs.symlink(path.join(outsideRoot, 'evals'), path.join(temporaryRoot, 'evals'));

    const result = await discoverFromProjectRoot(temporaryRoot);

    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'fixture-reference-unsafe'));
    assert.equal(result.suites.length, 0);
  });

  it('rejects absolute fixture references', async () => {
    const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-absolute-'));
    await fs.mkdir(path.join(temporaryRoot, 'evals'));
    await fs.writeFile(path.join(temporaryRoot, 'evals', 'absolute.json'), JSON.stringify({
      ...validSuitePayload(),
      testCases: [{ id: 'absolute', input: { fixture: path.join(os.tmpdir(), 'outside.txt') }, assertions: [{ type: 'contains', value: 'x' }] }],
    }));

    const result = await discoverFromProjectRoot(temporaryRoot);

    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'fixture-reference-unsafe'));
  });
});

async function discoverFromFixture(name: string) {
  return discoverFromProjectRoot(path.join(fixturesRoot, name));
}

async function discoverFromProjectRoot(projectRoot: string) {
  return discoverConventionalEvalSuites(
    { type: 'discover-conventional-eval-suites', projectRoot },
    { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: new CapturingLogger() }
  );
}

function validSuitePayload(): Record<string, unknown> {
  return {
    version: 1,
    kind: 'sibu-eval-suite',
    id: 'outside',
    name: 'Outside',
    description: 'Should not be loaded.',
    modelOptions: [{ id: 'gpt-5', label: 'GPT-5' }],
    testCases: [{ id: 'case', input: { prompt: 'safe' }, assertions: [{ type: 'contains', value: 'safe' }] }],
  };
}

class CapturingLogger implements EvalSuiteDiscoveryLoggerPort {
  info(_event: EvalSuiteDiscoveryLogEvent): void {}

  warn(_event: EvalSuiteDiscoveryLogEvent): void {}
}
