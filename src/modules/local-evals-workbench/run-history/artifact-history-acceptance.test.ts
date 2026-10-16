import assert from 'node:assert/strict';
import { it } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRunHistory } from '../index.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { fixture } from './store-fixture.js';
import { executeEvalRun } from '../execute-eval-run/handler.js';
import { evaluateOutputAssertions } from '../run-execution/output-assertions.js';
import type { ArtifactStorePort } from './contracts.js';
import type { ExecutionEvent, ExecutionSelection } from '../run-execution/contracts.js';
async function contents(directory: string): Promise<string> {
  let result = '';
  for (const entry of await readdir(directory, { withFileTypes: true })) result += entry.isDirectory() ? await contents(path.join(directory, entry.name)) : await readFile(path.join(directory, entry.name), 'utf8');
  return result;
}
function cliResult(root: string, ...args: string[]): { value: Record<string, unknown>; stderr: string } {
  const output = spawnSync(process.execPath, [path.resolve('bin/sibu.js'), 'evals', 'result', ...args],
    { cwd: root, encoding: 'utf8', timeout: 20_000 });
  assert.ifError(output.error);
  return { value: JSON.parse(output.stdout) as Record<string, unknown>, stderr: output.stderr };
}
it('AC-08/10: bounded raw synthetic output survives fresh reads, stays ignored, and stays out of logs', async () => {
  const p = await project(); const logs: string[] = []; try {
    const before = p.git('status', '--porcelain');
    const history = createRunHistory(p.root, { log: line => logs.push(line) }); const run = await history.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    const id = run.value.runId; await history.store.start('suite', id);
    const marker = 'SYNTHETIC_SECRET_SENTINEL';
    assert.equal((await history.store.append('suite', id, { ...evidence(id), output: marker, turns: [{ id: 'turn', role: 'assistant', content: marker }] })).status, 'ok');
    assert.equal((await history.store.finalize('suite', id, 'completed')).status, 'ok');
    const module = new URL('../index.js', import.meta.url).href;
    const script = `import {createRunHistory} from ${JSON.stringify(module)}; const h=createRunHistory(process.argv[1], {log(){}}); console.log(JSON.stringify(await h.list({suiteId:'suite'})));`;
    const restored = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script, p.root], { encoding: 'utf8' }));
    assert.equal(restored.value[0].runId, id); assert.equal(restored.value[0].state, 'completed');
    assert.equal(p.git('status', '--porcelain'), before);
    assert.ok((await contents(path.join(p.root, 'evals/artifacts'))).includes(marker)); assert.ok(!logs.join('').includes(marker));
    const selected = await history.get({ suiteId: 'suite', runId: id, selection: { caseId: 'case', attempt: 1 } });
    assert.equal(selected.status === 'ok' && selected.value.evidence?.output, marker);
  } finally { await p.cleanup(); }
});

it('fake runner retains earlier exact bytes when a later source write hits a capture limit', async () => {
  const p = await project(); const logs: string[] = [];
  try {
    const a = { store: createRunHistory(p.root, { log: line => logs.push(line) }).store };
    const created = await a.store.create(config); if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
    const runId = created.value.runId;
    const testCase = { id: 'case', name: 'Case', turns: [{ role: 'user' as const, content: { type: 'inline' as const, text: 'request' } }],
      toolMocks: [], assertions: [{ id: 'assertion', type: 'output-equals' as const,
        expected: { type: 'inline' as const, text: 'EXPECTED' } }], graders: [] };
    const selection: ExecutionSelection = { runId, model: 'synthetic',
      suite: { version: 2, kind: 'sibu-eval-suite', id: 'suite', name: 'Suite', description: '',
        target: { id: 'target', kind: 'integration', path: 'src/target.mjs' }, coverage: { categories: [], gaps: [] },
        runner: { command: ['node', 'evals/runner.mjs'], requiredEnvironment: [] }, testCases: [testCase] }, cases: [testCase] };
    const raw = 'EARLIER-RAW-☃'.repeat(100);
    const call = (id: string, value: string) => ({ kind: 'model-call' as const, id, turnId: 'turn', checkId: 'assertion',
      modelId: 'synthetic', phase: 'initial' as const, elapsedMs: 1, inputMessages: [], rawText: value,
      rawToolCalls: [], normalizedOutput: 'NORMALIZED' });
    const events: ExecutionEvent[] = [
      { type: 'case-started', caseId: 'case', attempt: 1 },
      { type: 'turn-completed', caseId: 'case', attempt: 1, turnId: 'turn', output: 'NORMALIZED' },
      { type: 'source-record', caseId: 'case', attempt: 1, sequence: 2, record: call('first', raw) },
      { type: 'source-record', caseId: 'case', attempt: 1, sequence: 3, record: call('later', 'PARTIAL-NEVER-PUBLISH') },
      { type: 'source-gap', caseId: 'case', attempt: 1, reason: 'incomplete', recordId: 'unfinished' },
      { type: 'case-completed', caseId: 'case', attempt: 1, status: 'completed', sourceCapture: 'incomplete' },
      { type: 'run-completed', status: 'completed' },
    ];
    const store: ArtifactStorePort = {
      create: configuration => a.store.create(configuration), start: (suiteId, id) => a.store.start(suiteId, id),
      append: (suiteId, id, attempt) => a.store.append(suiteId, id, attempt),
      finalize: (suiteId, id, state, diagnostics) => a.store.finalize(suiteId, id, state, diagnostics),
      saveSourceRecord: value => value.record.id === 'later'
      ? Promise.resolve({ status: 'blocked', reason: 'limit-exceeded' }) : a.store.saveSourceRecord!(value) };
    const outcome = await executeEvalRun(selection, { store, evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now,
      runner: { async execute(_selection, consume) { for (const event of events) await consume(event); return { status: 'completed' as const }; } } });
    assert.equal(outcome.status, 'completed');
    const reopened = createRunHistory(p.root, { log: line => logs.push(line) });
    const selected = await reopened.readSource('suite', runId, { caseId: 'case', attempt: 1, assertionId: 'assertion' });
    assert.equal(selected.status, 'ok');
    if (selected.status !== 'ok') return;
    assert.deepEqual(selected.value?.gaps, [{ reason: 'capture-failed', recordId: 'later' },
      { reason: 'incomplete', recordId: 'unfinished' }]);
    assert.equal(selected.value?.modelCalls.length, 1);
    const field = await reopened.readField('suite', runId, { caseId: 'case', attempt: 1, assertionId: 'assertion' },
      'first~rawText', 0, 8_192);
    assert.equal(field.status === 'ok' && Buffer.from(field.value.bytes).toString('utf8'), raw);
    const summary = cliResult(p.root, 'suite', runId);
    assert.equal(summary.value.status, 'ready');
    assert.doesNotMatch(JSON.stringify(summary.value) + summary.stderr, /EARLIER-RAW|PARTIAL-NEVER-PUBLISH/);
    const selectedCli = cliResult(p.root, 'suite', runId, '--case', 'case', '--attempt', '1', '--assertion', 'assertion');
    assert.equal(selectedCli.value.status, 'ready');
    const cliSource = (selectedCli.value.failure as { source: { modelCalls: { rawText: { locator: string } }[];
      gaps: { reason: string; recordId?: string }[] } }).source;
    assert.deepEqual(cliSource.gaps, [{ reason: 'capture-failed', recordId: 'later' },
      { reason: 'incomplete', recordId: 'unfinished' }]);
    assert.equal(cliSource.modelCalls[0]?.rawText.locator, 'first~rawText');
    assert.doesNotMatch(JSON.stringify(selectedCli.value) + selectedCli.stderr, /PARTIAL-NEVER-PUBLISH/);
    const parts: Buffer[] = [];
    let offset = 0;
    while (true) {
      const continuation = cliResult(p.root, 'suite', runId, '--case', 'case', '--attempt', '1', '--assertion', 'assertion',
        '--field', 'first~rawText', '--offset', String(offset));
      assert.equal(continuation.value.status, 'ready');
      const field = continuation.value.field as { bytesBase64: string; nextOffset: number | null };
      parts.push(Buffer.from(field.bytesBase64, 'base64'));
      if (field.nextOffset === null) break;
      offset = field.nextOffset;
    }
    assert.equal(Buffer.concat(parts).toString('utf8'), raw);
    const saved = await contents(path.join(p.root, 'evals/artifacts'));
    assert.ok(saved.includes(raw));
    assert.ok(!saved.includes('PARTIAL-NEVER-PUBLISH'));
    assert.doesNotMatch(logs.join(''), /EARLIER-RAW|PARTIAL-NEVER-PUBLISH/);
    const sourcePath = fixture(p.root).paths.source('suite', runId, 'case', 1, 'first');
    const absoluteSource = path.join(p.root, 'evals/artifacts', sourcePath);
    const original = await readFile(absoluteSource, 'utf8');
    await writeFile(absoluteSource, '{corrupt');
    assert.equal(cliResult(p.root, 'suite', runId, '--case', 'case', '--attempt', '1', '--assertion', 'assertion').value.reason,
      'corrupt-artifact');
    await writeFile(absoluteSource, original);
    p.git('add', '-f', `evals/artifacts/${sourcePath}`);
    assert.equal(cliResult(p.root, 'suite', runId, '--case', 'case', '--attempt', '1', '--assertion', 'assertion').value.reason,
      'unsafe-artifact');
  } finally { await p.cleanup(); }
});
it('refuses artifact creation when the disposable root is not effectively ignored', async () => {
  const p = await project(false); try {
    assert.deepEqual(await createRunHistory(p.root).store.create(config), { status: 'blocked', reason: 'not-ignored' });
  } finally { await p.cleanup(); }
});
it('older failed artifact exposes not-captured in selected CLI and no raw text in its locator summary', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const created = await a.store.create(config);
    if (created.status !== 'ok') return assert.fail(JSON.stringify(created));
    const runId = created.value.runId;
    await a.store.start('suite', runId);
    const base = evidence(runId);
    assert.equal((await a.store.append('suite', runId, { ...base, outcome: 'failed', output: 'OLD-RAW-SENTINEL',
      assertions: [{ ...base.assertions[0]!, outcome: 'failed', actual: 'OLD-RAW-SENTINEL' }] })).status, 'ok');
    await a.store.finalize('suite', runId, 'completed');
    const summary = cliResult(p.root, 'suite', runId);
    assert.equal(summary.value.status, 'ready');
    assert.doesNotMatch(JSON.stringify(summary.value), /OLD-RAW-SENTINEL/);
    const selected = cliResult(p.root, 'suite', runId, '--case', 'case', '--attempt', '1', '--assertion', 'assertion');
    assert.deepEqual((selected.value.failure as { source: unknown }).source, { status: 'gap', reason: 'not-captured' });
  } finally { await p.cleanup(); }
});
it('reads version-1 input-unsafe manifest and attempt without migration or inferred provider cause', async () => {
  const p = await project(); const logs: string[] = []; try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail();
    const id = run.value.runId;
    assert.equal((await a.store.start('suite', id)).status, 'ok');
    assert.equal((await a.store.append('suite', id, { ...evidence(id), diagnostics: ['input-unsafe'] })).status, 'ok');
    assert.equal((await a.store.finalize('suite', id, 'blocked', ['input-unsafe'])).status, 'ok');
    const manifestPath = path.join(p.root, 'evals/artifacts', a.paths.run('suite', id));
    const attemptPath = path.join(p.root, 'evals/artifacts', a.paths.attempt('suite', id, 'case', 1));
    const before = await Promise.all([readFile(manifestPath), readFile(attemptPath)]);
    assert.equal(JSON.parse(before[0].toString()).cases[0].testedModel, undefined);
    const history = createRunHistory(p.root, { log: line => logs.push(line) });
    const detail = await history.get({ suiteId: 'suite', runId: id, selection: { caseId: 'case', attempt: 1 } });
    const listed = await history.list({ suiteId: 'suite' });
    assert.equal(detail.status, 'ok');
    if (detail.status === 'ok') {
      assert.equal(detail.value.summary.version, 1);
      assert.equal(detail.value.summary.state, 'blocked');
      assert.deepEqual(detail.value.summary.diagnostics, ['input-unsafe']);
      assert.deepEqual(detail.value.evidence?.diagnostics, ['input-unsafe']);
      assert.deepEqual(detail.value.summary.cases.map(({ testedModel, judgeModel }) => ({ testedModel, judgeModel })),
        [{ testedModel: config.testedModel, judgeModel: config.judgeModel }]);
    }
    assert.equal(listed.status === 'ok' && listed.value[0]?.state, 'blocked');
    assert.equal(listed.status === 'ok' && listed.value[0]?.outcome, 'incomplete');
    assert.deepEqual(await Promise.all([readFile(manifestPath), readFile(attemptPath)]), before);
    assert.ok(!logs.join('').includes('credential') && !logs.join('').includes('provider'));
  } finally { await p.cleanup(); }
});
it('an obsolete regular writer.lock neither blocks recovery/new writes nor gets removed', async () => {
  const p = await project(); try {
    const a = fixture(p.root); const run = await a.store.create(config); if (run.status !== 'ok') return assert.fail(JSON.stringify(run));
    await writeFile(path.join(p.root, 'evals/artifacts/writer.lock'), '');
    const h = createRunHistory(p.root, { legacyRecoveryOnRead: true, owner: { identity: { pid: 456, token: 'new' }, async check() { return 'stopped'; } }, log() {} });
    const detail = await h.get({ suiteId: 'suite', runId: run.value.runId });
    assert.equal(detail.status === 'ok' && detail.value.summary.state, 'interrupted');
    assert.ok(detail.status === 'ok' && !detail.warnings?.includes('owner-unknown'));
    assert.equal((await h.store.create(config)).status, 'ok');
    assert.equal(await readFile(path.join(p.root, 'evals/artifacts/writer.lock'), 'utf8'), '');
  } finally { await p.cleanup(); }
});

it('TECH-02: a killed writer leaves no lock barrier; a fresh process recovers evidence and completes a new save', async () => {
  const p = await project(); try {
    const fixtureModule = new URL('./store-fixture.js', import.meta.url).href;
    const evidenceModule = new URL('./test-fixtures.js', import.meta.url).href;
    const ownerModule = new URL('./active-run-owner.js', import.meta.url).href;
    const publicModule = new URL('../index.js', import.meta.url).href;
    const stopped = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import {fixture} from ${JSON.stringify(fixtureModule)};
      import {config,evidence} from ${JSON.stringify(evidenceModule)};
      import {ProcessRunOwner} from ${JSON.stringify(ownerModule)};
      let crash = false;
      const a=fixture(process.argv[1], {owner:new ProcessRunOwner(), fault(stage,relative) {
        if(crash && stage==='rename' && relative.includes('/cases/')) process.kill(process.pid,'SIGKILL');
      }});
      const r=await a.store.create({...config,caseIds:['case','unfinished']}); assert.equal(r.status,'ok');
      const id=r.value.runId;
      assert.equal((await a.store.start('suite',id)).status,'ok');
      assert.equal((await a.store.append('suite',id,evidence(id))).status,'ok');
      console.log(JSON.stringify({id}));
      crash=true; await a.store.append('suite',id,{...evidence(id),caseId:'unfinished'});
    `, p.root], { encoding: 'utf8', timeout: 20000 });
    assert.ifError(stopped.error); assert.equal(stopped.signal, 'SIGKILL', stopped.stderr);
    const { id } = JSON.parse(stopped.stdout);
    const lock = path.join(p.root, 'evals/artifacts/writer.lock');
    await assert.rejects(readFile(lock), { code: 'ENOENT' });
    assert.ok((await readdir(path.join(p.root, 'evals/artifacts'), { recursive: true })).some(name => name.includes('.tmp-')));
    const script = `
      import assert from 'node:assert/strict';
      import {createRunHistory} from ${JSON.stringify(publicModule)};
      import {config,evidence} from ${JSON.stringify(evidenceModule)};
      const h=createRunHistory(process.argv[1], {legacyRecoveryOnRead:true,log(){}});
      const old=await h.get({suiteId:'suite',runId:process.argv[2],selection:{caseId:'case',attempt:1}});
      assert.equal(old.status,'ok');
      const next=await h.store.create(config); assert.equal(next.status,'ok'); const id=next.value.runId;
      assert.equal((await h.store.start('suite',id)).status,'ok');
      assert.equal((await h.store.append('suite',id,evidence(id))).status,'ok');
      assert.equal((await h.store.finalize('suite',id,'completed')).status,'ok');
      console.log(JSON.stringify({old,next:await h.list({suiteId:'suite'})}));
    `;
    const restored = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script, p.root, id], { encoding: 'utf8', timeout: 20000 }));
    assert.equal(restored.old.value.summary.state, 'interrupted');
    assert.equal(restored.old.value.summary.outcome, 'incomplete');
    assert.equal(restored.old.value.summary.cases[0].attempts.length, 1);
    assert.equal(restored.old.value.summary.cases[1].state, 'not-run');
    assert.equal(restored.old.value.evidenceStatus, 'available');
    assert.deepEqual(restored.next.value.map((entry: { state: string }) => entry.state), ['completed', 'interrupted']);
    await assert.rejects(readFile(lock), { code: 'ENOENT' });
  } finally { await p.cleanup(); }
});
