import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { validateEvalSuiteContract } = await import(new URL('../../../../../bin/modules/local-evals-workbench/index.js', import.meta.url).href);
export const fixtureRoot = fileURLToPath(new URL('./', import.meta.url));
// These typed interfaces describe trusted test modules, not untrusted process output.
export async function fixtureModules() {
    const handler = await import(pathToFileURL(path.join(fixtureRoot, 'runner-handler.mjs')).href);
    const adapters = await import(pathToFileURL(path.join(fixtureRoot, 'test-ports.mjs')).href);
    return { ...handler, ...adapters };
}
export async function suite() {
    const result = validateEvalSuiteContract(JSON.parse(await fs.readFile(path.join(fixtureRoot, 'representative-suite.json'), 'utf8')), 'evals/representative-suite.json');
    assert.equal(result.status, 'valid');
    if (result.status !== 'valid')
        throw new Error('Invalid test fixture');
    return result.suite;
}
export function command(testCases, operation = 'execute') {
    return { protocolVersion: 1, requestId: 'request-1', operation, runId: 'run-1', model: 'fake/target', judgeModel: testCases.some((item) => item.graders.some((grader) => grader.type === 'rubric')) ? 'fake/judge' : null, testCases };
}
export async function project(t) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sibu-authoring-fixture-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    await fs.cp(fixtureRoot, root, { recursive: true });
    await fs.mkdir(path.join(root, 'evals'));
    await fs.copyFile(path.join(root, 'representative-suite.json'), path.join(root, 'evals/suite.json'));
    return root;
}
function parseEvent(line) {
    const value = JSON.parse(line);
    assert.ok(value && typeof value === 'object');
    assert.ok('protocolVersion' in value && value.protocolVersion === 1);
    assert.ok('requestId' in value && typeof value.requestId === 'string');
    assert.ok('sequence' in value && Number.isInteger(value.sequence));
    assert.ok('type' in value && typeof value.type === 'string');
    for (const key of ['runId', 'caseId', 'attempt', 'data'])
        assert.ok(key in value);
    return value;
}
export function invoke(root, request, evalMode = '1') {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [path.join(root, 'runner-entrypoint.mjs')], {
            cwd: root, shell: false, env: evalMode ? { SIBU_EVAL_MODE: evalMode } : {}, stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let failure;
        const timer = setTimeout(() => { failure = new Error('Fixture timeout'); child.kill(); }, 5000);
        function collect(chunk, diagnostic) {
            if (diagnostic)
                stderr += chunk.toString();
            else
                stdout += chunk.toString();
            if (Buffer.byteLength(stdout) > 262144 || Buffer.byteLength(stderr) > 4096) {
                failure = new Error('Fixture output limit');
                child.kill();
            }
        }
        child.stdout.on('data', (chunk) => collect(chunk, false));
        child.stderr.on('data', (chunk) => collect(chunk, true));
        child.on('error', (error) => { clearTimeout(timer); reject(error); });
        child.stdin.on('error', () => { });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (failure) {
                reject(failure);
                return;
            }
            try {
                resolve({ code, stdout, stderr, events: stdout.trim().split('\n').map(parseEvent) });
            }
            catch (error) {
                reject(error);
            }
        });
        child.stdin.end(typeof request === 'string' ? request : JSON.stringify(request));
    });
}
