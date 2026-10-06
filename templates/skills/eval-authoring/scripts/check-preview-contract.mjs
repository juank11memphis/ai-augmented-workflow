import { spawn } from 'node:child_process';

const MAX_STARTUP_OUTPUT = 16_000;
const STARTUP_TIMEOUT_MS = 10_000;
const PREVIEW_TIMEOUT_MS = 15_000;

function selectionFromArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!['--suite', '--case', '--model', '--judge'].includes(name) || !value || values.has(name)) {
      throw new Error('usage');
    }
    values.set(name, value);
  }
  if (!values.has('--suite') || !values.has('--model')) throw new Error('usage');
  return {
    suiteId: values.get('--suite'),
    scope: values.has('--case') ? { type: 'test_case', testCaseId: values.get('--case') } : { type: 'all' },
    model: values.get('--model'),
    judgeModel: values.get('--judge') ?? null,
  };
}

function startWorkbench() {
  const child = spawn(process.env.SIBU_CLI || 'sibu', ['evals'], {
    cwd: process.cwd(), env: process.env, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', () => undefined);
  const url = new Promise((resolve, reject) => {
    let output = '';
    let settled = false;
    const timeout = setTimeout(() => finish(undefined, new Error('startup-timeout')), STARTUP_TIMEOUT_MS);
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(value);
    };
    child.stdout.on('data', (chunk) => {
      if (settled) return;
      output += chunk.toString();
      if (output.length > MAX_STARTUP_OUTPUT) return finish(undefined, new Error('startup-output-limit'));
      const match = output.match(/URL: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) finish(match[1]);
    });
    child.once('error', () => finish(undefined, new Error('workbench-start-failed')));
    child.once('exit', () => finish(undefined, new Error('workbench-exited')));
  });
  return { child, url };
}

async function main() {
  let workbench;
  try {
    const selection = selectionFromArgs(process.argv.slice(2));
    workbench = startWorkbench();
    const url = await workbench.url;
    const response = await fetch(new URL('/api/eval-runs/preview', url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(selection),
      signal: AbortSignal.timeout(PREVIEW_TIMEOUT_MS),
    });
    const result = await response.json();
    if (response.status !== 200 || result.status !== 'ready') {
      const category = result.issue?.category ?? result.reason ?? 'unknown';
      throw new Error(`preview-blocked:${String(category).slice(0, 80)}`);
    }
    console.log(JSON.stringify({ status: 'ready', suiteId: result.suiteId,
      selectedCaseIds: result.selectedCaseIds, targetCalls: result.targetCalls,
      judgeCalls: result.judgeCalls, totalCalls: result.totalCalls }));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error(`Sibu preview contract check failed: ${reason === 'usage'
      ? 'use --suite ID --model ID [--judge ID] [--case ID]' : reason}`);
    process.exitCode = 1;
  } finally {
    workbench?.child.kill('SIGTERM');
  }
}

await main();
