import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { declaredRunnerFile } from '../discover-conventional-eval-suites/index.js';
import type { RunnerExecutorPort } from '../execute-eval-run/ports.js';
import type { ExecutionEvent, ExecutionSelection, RunnerExecutionOutcome } from '../run-execution/contracts.js';
import type { PreviewLoggerPort } from '../runtime-ports.js';
import { runnerEnvironment } from './environment.js';
import { ExecuteEventValidator } from './execute-events.js';
import { BoundedExecuteStream } from './execute-stream.js';

export type ExecuteLimits = {
  readonly requestBytes: number; readonly lineBytes: number; readonly stdoutBytes: number;
  readonly stderrBytes: number; readonly events: number; readonly startupMs: number;
  readonly idleMs: number; readonly overallMs: number; readonly cleanupMs: number;
};
export const EXECUTE_LIMITS: ExecuteLimits = {
  requestBytes: 256_000, lineBytes: 64_000, stdoutBytes: 1_000_000, stderrBytes: 16_000,
  events: 1_000, startupMs: 5_000, idleMs: 10_000, overallMs: 120_000, cleanupMs: 1_000,
};

export class ProjectRunnerExecuteAdapter implements RunnerExecutorPort {
  constructor(private readonly projectRoot: string, private readonly limits: ExecuteLimits = EXECUTE_LIMITS,
    private readonly environment: NodeJS.ProcessEnv = process.env, private readonly logger?: PreviewLoggerPort) {}

  async execute(selection: ExecutionSelection, consume: (event: ExecutionEvent) => Promise<void>): Promise<RunnerExecutionOutcome> {
    const environment = runnerEnvironment(selection.suite, this.environment);
    if (environment.status === 'blocked') return { status: 'blocked', reason: environment.reason };
    if (!await this.runnerContained(selection)) return { status: 'blocked', reason: 'runner-unavailable' };
    const requestId = randomUUID();
    const request = Buffer.from(JSON.stringify({ protocolVersion: 1, requestId, operation: 'execute', runId: selection.runId,
      model: selection.model, judgeModel: selection.judgeModel ?? null, testCases: selection.cases }) + '\n');
    if (request.length > this.limits.requestBytes) return { status: 'blocked', reason: 'runner-request-too-large' };
    const started = Date.now();
    const log = (event: string, reason?: string): void => {
      try { this.logger?.record({ event, reason, durationMs: Date.now() - started }); } catch { /* Noncritical sink. */ }
    };
    log('eval_runner_execute_started');
    const child = spawn(selection.suite.runner.command[0]!, selection.suite.runner.command.slice(1),
      { cwd: this.projectRoot, env: environment.value.values, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    const validator = new ExecuteEventValidator(requestId, selection);
    let failure: string | undefined;
    let consumerFailure: unknown;
    let stderrBytes = 0;
    let firstEvent = false;
    const stream = new BoundedExecuteStream(this.limits);
    let forceKill: NodeJS.Timeout | undefined;
    let settleAbort: (() => void) | undefined;
    const aborted = new Promise<void>(resolve => { settleAbort = resolve; });
    const abort = (reason: string): void => {
      if (failure) return;
      failure = reason;
      child.kill('SIGTERM');
      forceKill = setTimeout(() => {
        child.kill('SIGKILL');
        child.stdout.destroy();
        child.stderr.destroy();
        settleAbort?.();
      }, this.limits.cleanupMs);
    };
    const startup = setTimeout(() => abort('runner-timeout'), this.limits.startupMs);
    let idle: NodeJS.Timeout | undefined;
    const resetIdle = (): void => { clearTimeout(idle); idle = setTimeout(() => abort('runner-timeout'), this.limits.idleMs); };
    resetIdle();
    const overall = setTimeout(() => abort('runner-timeout'), this.limits.overallMs);
    child.on('error', () => abort('runner-start-failed'));
    child.stdin.on('error', () => abort('runner-unavailable'));
    child.stderr.on('data', (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes > this.limits.stderrBytes) abort('runner-limit');
    });
    const closed = new Promise<number | null>(resolve => child.once('close', resolve));
    child.stdin.end(request);
    const readAndClose = async (): Promise<number | null> => {
      for await (const chunk of child.stdout) {
        if (failure) break;
        try {
          await stream.push(chunk, async raw => {
            const event = validator.accept(raw);
            if (!firstEvent) { firstEvent = true; clearTimeout(startup); }
            resetIdle();
            try { await consume(event); }
            catch (error) { consumerFailure = error; throw error; }
          });
        } catch (error) { abort(error instanceof Error && error.message.includes('limit') ? 'runner-limit' : 'runner-protocol-invalid'); }
      }
      return closed;
    };
    try {
      const code = await Promise.race([readAndClose(), aborted.then(() => null)]);
      if (consumerFailure) throw consumerFailure;
      if (!failure) {
        try { stream.finish(); } catch { failure = 'runner-protocol-invalid'; }
      }
      if (!failure && code !== 0) failure = 'runner-exited';
      if (!failure && !validator.completion) failure = 'runner-protocol-invalid';
      const status = failure ? 'error' : validator.completion!;
      log('eval_runner_execute_finished', failure ?? status);
      return { status, ...(failure ? { reason: failure } : {}) };
    } finally {
      clearTimeout(startup); clearTimeout(idle); clearTimeout(overall); clearTimeout(forceKill);
      if (failure && child.exitCode === null) child.kill('SIGKILL');
    }
  }

  private async runnerContained(selection: ExecutionSelection): Promise<boolean> {
    const runner = declaredRunnerFile(selection.suite.runner.command);
    if (!runner) return false;
    try {
      const root = await realpath(this.projectRoot);
      const candidate = path.resolve(root, runner.path);
      const relative = path.relative(root, candidate);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
      const actual = await realpath(candidate);
      const actualRelative = path.relative(root, actual);
      return !actualRelative.startsWith('..') && !path.isAbsolute(actualRelative) && (await stat(candidate)).isFile();
    } catch { return false; }
  }
}
