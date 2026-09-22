import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { NodeEvalSuiteDiscoveryReader } from './eval-suite-discovery-reader.js';
import { discoverConventionalEvalSuites } from './handler.js';
import type { EvalSuiteDiscoveryLogEvent, EvalSuiteDiscoveryLoggerPort } from './ports.js';

const fixturesRoot = path.join(process.cwd(), 'src/modules/local-evals-workbench/discover-conventional-eval-suites/fixtures');

describe('NodeEvalSuiteDiscoveryReader', () => {
  it('loads a contained version-2 suite and exposes its normalized definition', async () => {
    const result = await discoverFromProjectRoot(path.join(fixturesRoot, 'valid-project'));
    assert.equal(result.status, 'ready');
    assert.equal(result.suites[0]?.id, 'support-agent');
    assert.equal(result.suites[0]?.readyTestCaseCount, 2);
    assert.equal(result.definitions[0]?.testCases[0]?.fixture?.type, 'file');
    assert.equal(result.diagnostics.length, 0);
  });

  it('reports missing evals and malformed JSON without exposing raw content', async () => {
    const missing = await discoverFromProjectRoot(path.join(fixturesRoot, 'empty-project'));
    assert.equal(missing.status, 'blocked');
    assert.equal(missing.reason, 'missing-evals-folder');

    const malformed = await discoverFromProjectRoot(path.join(fixturesRoot, 'malformed-project'));
    assert.equal(malformed.status, 'blocked');
    assert.ok(malformed.diagnostics.some((item) => item.code === 'suite-file-read-failed'));
    assert.ok(malformed.diagnostics.some((item) => item.code === 'suite-definition-malformed'));
    assert.doesNotMatch(JSON.stringify(malformed), /not json|credential-value/);
  });

  it('blocks version 1 with safe regeneration guidance', async () => {
    const result = await discoverFromProjectRoot(path.join(fixturesRoot, 'unsupported-project'));
    assert.equal(result.status, 'blocked');
    const diagnostic = result.diagnostics.find((item) => item.code === 'suite-definition-unsupported');
    assert.equal(diagnostic?.reason, 'unsupported-suite-version');
    assert.match(diagnostic?.guidance?.join(' ') ?? '', /version 2/i);
  });

  it('rejects an evals-directory symlink that escapes the project', async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-project-'));
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-outside-'));
    await fs.mkdir(path.join(outside, 'evals'));
    await fs.writeFile(path.join(outside, 'evals', 'outside.json'), JSON.stringify(validSuite()));
    await fs.symlink(path.join(outside, 'evals'), path.join(project, 'evals'));

    const result = await discoverFromProjectRoot(project);
    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((item) => item.reason === 'evals-folder-unsafe'));
    assert.equal(result.suites.length, 0);
  });

  it('rejects a suite-file symlink that escapes the project', async () => {
    const project = await createProject();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-suite-outside-'));
    await fs.writeFile(path.join(outside, 'linked.json'), JSON.stringify(validSuite({ id: 'linked' })));
    await fs.symlink(path.join(outside, 'linked.json'), path.join(project, 'evals', 'linked.json'));

    const result = await discoverFromProjectRoot(project);
    assert.equal(result.status, 'ready');
    assert.deepEqual(result.suites.map((suite) => suite.id), ['suite']);
    assert.ok(result.diagnostics.some((item) => item.reason === 'suite-file-unsafe'));
  });

  it('rejects symlinked reference leaves and intermediate directories outside evals', async () => {
    for (const placement of ['leaf', 'intermediate']) {
      const project = await createProject();
      const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-reference-outside-'));
      await fs.writeFile(path.join(outside, 'secret.txt'), 'do not expose this content');
      if (placement === 'leaf') {
        await fs.rm(path.join(project, 'evals', 'references', 'context.md'));
        await fs.symlink(path.join(outside, 'secret.txt'), path.join(project, 'evals', 'references', 'context.md'));
      } else {
        await fs.rm(path.join(project, 'evals', 'references'), { recursive: true });
        await fs.symlink(outside, path.join(project, 'evals', 'references'));
      }
      await writeSuite(project, validSuite({ testCases: [validCase({ reference: { type: 'file', path: 'references/context.md' } })] }));

      const result = await discoverFromProjectRoot(project);
      assert.equal(result.status, 'blocked', placement);
      assert.ok(result.diagnostics.some((item) => item.reason === 'declared-path-symlink-escape'));
      assert.doesNotMatch(JSON.stringify(result), /do not expose|reference-outside/);
    }
  });

  it('checks nearest existing ancestors for missing and not-yet-existing candidates', async () => {
    const missingProject = await createProject();
    await writeSuite(missingProject, validSuite({ testCases: [validCase({ fixture: { type: 'file', path: 'missing/nested/input.json' } })] }));
    const missing = await discoverFromProjectRoot(missingProject);
    assert.ok(missing.diagnostics.some((item) => item.reason === 'declared-file-missing'));

    const escapedProject = await createProject();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-nearest-outside-'));
    await fs.mkdir(path.join(outside, 'nested'));
    await fs.symlink(outside, path.join(escapedProject, 'evals', 'linked'));
    await writeSuite(escapedProject, validSuite({ testCases: [validCase({ fixture: { type: 'file', path: 'linked/nested/not-created.json' } })] }));
    const escaped = await discoverFromProjectRoot(escapedProject);
    assert.ok(escaped.diagnostics.some((item) => item.reason === 'declared-path-symlink-escape'));
  });

  it('rejects sensitive file-backed inputs without returning their content or paths', async () => {
    const project = await createProject();
    const sensitiveValue = 'OPENAI_API_KEY=sk-file-sensitive-value';
    await fs.writeFile(path.join(project, 'evals', 'fixtures', 'input.json'), sensitiveValue);

    const result = await discoverFromProjectRoot(project);
    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((item) => item.code === 'sensitive-content-detected'));
    assert.doesNotMatch(JSON.stringify(result), /sk-file-sensitive-value|sibu-evals-project-/);
  });

  it('validates basename-only runner files for existence and symlink containment', async () => {
    const containedProject = await createProject();
    await fs.writeFile(path.join(containedProject, 'runner.mjs'), 'export {};');
    await writeSuite(containedProject, validSuite({ runner: { command: ['node', 'runner.mjs'], requiredEnvironment: [] } }));
    const contained = await discoverFromProjectRoot(containedProject);
    assert.equal(contained.status, 'ready');

    await fs.rm(path.join(containedProject, 'runner.mjs'));
    const missing = await discoverFromProjectRoot(containedProject);
    assert.equal(missing.status, 'blocked');
    assert.ok(missing.diagnostics.some((item) => item.reason === 'declared-file-missing'));

    const linkedProject = await createProject();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-runner-outside-'));
    await fs.writeFile(path.join(outside, 'runner.mjs'), 'export {};');
    await fs.symlink(path.join(outside, 'runner.mjs'), path.join(linkedProject, 'runner.mjs'));
    await writeSuite(linkedProject, validSuite({ runner: { command: ['node', 'runner.mjs'], requiredEnvironment: [] } }));
    const linked = await discoverFromProjectRoot(linkedProject);
    assert.equal(linked.status, 'blocked');
    assert.ok(linked.diagnostics.some((item) => item.reason === 'declared-path-symlink-escape'));
  });

  it('rejects oversized suite definitions before parsing with a safe diagnostic', async () => {
    const project = await createProject();
    await fs.writeFile(path.join(project, 'evals', 'suite.json'), ' '.repeat(1_000_001));

    const result = await discoverFromProjectRoot(project);
    assert.equal(result.status, 'blocked');
    assert.ok(result.diagnostics.some((item) => item.reason === 'suite-definition-too-large'));
    assert.doesNotMatch(JSON.stringify(result), /sibu-evals-project-/);
  });

  it('rejects generated nested symlink placements across target, runner, fixture, and reference paths', async () => {
    const declarations = [
      { key: 'target', suite: (pathValue: string) => validSuite({ target: { id: 'target', kind: 'agent', path: pathValue } }) },
      { key: 'runner', suite: (pathValue: string) => validSuite({ runner: { command: ['node', pathValue], requiredEnvironment: [] } }) },
      { key: 'fixture', suite: (pathValue: string) => validSuite({ testCases: [validCase({ fixture: { type: 'file', path: pathValue } })] }) },
      { key: 'reference', suite: (pathValue: string) => validSuite({ testCases: [validCase({ reference: { type: 'file', path: pathValue } })] }) },
    ];
    for (const declaration of declarations) {
      const project = await createProject();
      const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-matrix-outside-'));
      await fs.writeFile(path.join(outside, 'file.txt'), 'safe external text');
      const root = declaration.key === 'target' || declaration.key === 'runner' ? project : path.join(project, 'evals');
      await fs.symlink(outside, path.join(root, 'escape'));
      await writeSuite(project, declaration.suite('escape/file.txt'));
      const result = await discoverFromProjectRoot(project);
      assert.equal(result.status, 'blocked', declaration.key);
      assert.ok(result.diagnostics.some((item) => item.reason === 'declared-path-symlink-escape'), declaration.key);
    }
  });
});

async function createProject(): Promise<string> {
  const project = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-evals-project-'));
  await fs.mkdir(path.join(project, 'src'), { recursive: true });
  await fs.mkdir(path.join(project, 'evals', 'runners'), { recursive: true });
  await fs.mkdir(path.join(project, 'evals', 'fixtures'), { recursive: true });
  await fs.mkdir(path.join(project, 'evals', 'references'), { recursive: true });
  await fs.writeFile(path.join(project, 'src', 'target.ts'), 'export {};');
  await fs.writeFile(path.join(project, 'evals', 'runners', 'runner.mjs'), 'export {};');
  await fs.writeFile(path.join(project, 'evals', 'fixtures', 'input.json'), '{"safe":true}');
  await fs.writeFile(path.join(project, 'evals', 'references', 'context.md'), 'Safe reference.');
  await writeSuite(project, validSuite());
  return project;
}

async function writeSuite(project: string, suite: Record<string, unknown>): Promise<void> {
  await fs.writeFile(path.join(project, 'evals', 'suite.json'), JSON.stringify(suite));
}

function validSuite(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: 'Safe suite.',
    target: { id: 'target', kind: 'agent', path: 'src/target.ts' },
    coverage: { categories: [{ id: 'happy', status: 'covered' }], gaps: [] },
    runner: { command: ['node', 'evals/runners/runner.mjs'], requiredEnvironment: [] },
    testCases: [validCase()], ...overrides,
  };
}

function validCase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'case', name: 'Case', turns: [{ role: 'user', content: 'Safe input.' }],
    fixture: { type: 'file', path: 'fixtures/input.json' },
    assertions: [{ id: 'output', type: 'output-contains', expected: 'safe' }], graders: [], ...overrides,
  };
}

async function discoverFromProjectRoot(projectRoot: string) {
  return discoverConventionalEvalSuites(
    { type: 'discover-conventional-eval-suites', projectRoot },
    { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: new CapturingLogger() }
  );
}

class CapturingLogger implements EvalSuiteDiscoveryLoggerPort {
  info(_event: EvalSuiteDiscoveryLogEvent): void {}
  warn(_event: EvalSuiteDiscoveryLogEvent): void {}
}
