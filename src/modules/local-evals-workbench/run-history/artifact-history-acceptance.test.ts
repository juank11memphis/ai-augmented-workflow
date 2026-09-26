import assert from 'node:assert/strict';
import { it } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRunHistory } from '../index.js';
import { project } from './test-project.js';
import { config, evidence } from './test-fixtures.js';
import { fixture } from './store-fixture.js';
async function contents(directory: string): Promise<string> {
  let result = '';
  for (const entry of await readdir(directory, { withFileTypes: true })) result += entry.isDirectory() ? await contents(path.join(directory, entry.name)) : await readFile(path.join(directory, entry.name), 'utf8');
  return result;
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
