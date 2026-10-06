import { spawn } from 'node:child_process';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { declaredRunnerFile, type NormalizedEvalSuite, type NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { PreviewLoggerPort, RunnerDescriptorPort } from '../runtime-ports.js';
import type { RunnerEstimatorPort } from '../run-configuration.js';
import type { RuntimeDescription, RuntimeOutcome } from '../runtime-description.js';
import type { RuntimeBlockReason } from '../runtime-description.js';
import { runnerEnvironment } from './environment.js';
import { BoundedNdjsonParser } from './ndjson-parser.js';
import { validateDescription, validateEnvelope, validatedFailureReason } from './description-validation.js';
import { validateEstimate, type ConsumptionEstimate } from './estimate-validation.js';
import { PREVIEW_PROCESS_LIMITS, type PreviewProcessLimits } from './limits.js';

export class ProjectRunnerProcessAdapter implements RunnerDescriptorPort, RunnerEstimatorPort {
  constructor(
    private readonly projectRoot: string,
    private readonly limits: PreviewProcessLimits = PREVIEW_PROCESS_LIMITS,
    private readonly environment: NodeJS.ProcessEnv = process.env,
    private readonly logger?: PreviewLoggerPort
  ) {}
  async describe(suite: NormalizedEvalSuite): Promise<RuntimeOutcome<RuntimeDescription>> {
    const outcome = await this.invoke(suite, { operation: 'describe' }, 'description');
    return outcome.status === 'blocked' ? outcome : validateDescription(outcome.value.data, outcome.value.secrets);
  }
  async estimate(suite: NormalizedEvalSuite, input: {
    readonly model: string; readonly judgeModel: string | null;
    readonly testCases: readonly NormalizedEvalTestCase[];
  }): Promise<RuntimeOutcome<ConsumptionEstimate>> {
    const outcome = await this.invoke(suite, { operation: 'estimate', ...input }, 'estimate');
    return outcome.status === 'blocked' ? outcome : validateEstimate(outcome.value.data, outcome.value.secrets);
  }
  private async invoke(
    suite: NormalizedEvalSuite,
    payload: Record<string, unknown>,
    eventType: 'description' | 'estimate'
  ): Promise<RuntimeOutcome<{ readonly data: unknown; readonly secrets: readonly string[] }>> {
    const environment = runnerEnvironment(suite, this.environment);
    if (environment.status === 'blocked') return environment;
    const containment = await this.runnerContained(suite);
    if (containment !== 'contained') return { status: 'blocked', reason: containment };
    const requestId = randomUUID();
    const body = Buffer.from(JSON.stringify({ protocolVersion: 1, requestId, ...payload }) + '\n');
    if (body.length > this.limits.requestBytes) return { status: 'blocked', reason: 'runner-request-too-large' };
    const { values, secrets } = environment.value;
    const startedAt = Date.now();
    this.log({ event: 'eval_runner_process_started', suiteId: suite.id });
    const child = spawn(suite.runner.command[0]!, suite.runner.command.slice(1), {
      cwd: this.projectRoot, env: values, shell: false, stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parser = new BoundedNdjsonParser(this.limits.eventLineBytes, this.limits.stdoutBytes);
    return new Promise((resolve) => {
      let settled = false;
      let failureReason: RuntimeBlockReason | undefined;
      let stderrBytes = 0;
      let firstOutput = false;
      let overall: NodeJS.Timeout;
      let idle: NodeJS.Timeout;
      let startup: NodeJS.Timeout;
      let forcedKill: NodeJS.Timeout | undefined;
      let cleanupTimeout: NodeJS.Timeout | undefined;
      const fail = (reason: RuntimeBlockReason): void => {
        if (failureReason) return;
        failureReason = reason;
        child.kill('SIGTERM');
        forcedKill = setTimeout(() => {
          child.kill('SIGKILL');
          cleanupTimeout = setTimeout(() => finish(null), this.limits.cleanupMs);
        }, this.limits.cleanupMs);
      };
      const resetIdle = (): void => {
        clearTimeout(idle);
        idle = setTimeout(() => fail('runner-timeout'), this.limits.idleMs);
      };
      const finish = (exitCode: number | null): void => {
        if (settled) return;
        settled = true;
        clearTimeout(startup); clearTimeout(idle); clearTimeout(overall); clearTimeout(forcedKill); clearTimeout(cleanupTimeout);
        if (failureReason || exitCode !== 0) {
          let reason: RuntimeBlockReason = failureReason ?? 'runner-exited';
          if (!failureReason) {
            try { reason = validatedFailureReason(parser.finish(), requestId) ?? reason; }
            catch { /* No complete, trustworthy diagnostic; retain the observed process exit. */ }
          }
          this.log({ event: 'eval_runner_process_blocked', suiteId: suite.id, reason, durationMs: Date.now() - startedAt });
          resolve({ status: 'blocked', reason });
          return;
        }
        try {
          const envelope = validateEnvelope(parser.finish(), requestId, eventType);
          this.log({ event: envelope.status === 'ready' ? 'eval_runner_process_exited' : 'eval_runner_process_blocked',
            suiteId: suite.id, reason: envelope.status === 'blocked' ? 'runner-protocol-invalid' : undefined, durationMs: Date.now() - startedAt });
          resolve(envelope.status === 'blocked' ? { status: 'blocked', reason: 'runner-protocol-invalid' }
            : { status: 'ready', value: { data: envelope.value, secrets } });
        } catch {
          this.log({ event: 'eval_runner_process_blocked', suiteId: suite.id, reason: 'runner-protocol-invalid', durationMs: Date.now() - startedAt });
          resolve({ status: 'blocked', reason: 'runner-protocol-invalid' });
        }
      };
      startup = setTimeout(() => fail('runner-timeout'), this.limits.startupMs);
      idle = setTimeout(() => fail('runner-timeout'), this.limits.idleMs);
      overall = setTimeout(() => fail('runner-timeout'), this.limits.overallMs);
      child.on('error', () => fail('runner-start-failed'));
      child.on('exit', () => { if (failureReason) finish(null); });
      child.on('close', finish);
      child.stdout.on('data', (chunk: Buffer) => {
        if (!firstOutput) { firstOutput = true; clearTimeout(startup); }
        try { parser.push(chunk); resetIdle(); } catch { fail('runner-protocol-invalid'); }
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderrBytes += chunk.length;
        if (stderrBytes > this.limits.stderrBytes) fail('runner-invalid');
        else resetIdle();
      });
      child.stdin.on('error', () => fail('runner-unavailable'));
      child.stdin.end(body);
    });
  }
  private async runnerContained(suite: NormalizedEvalSuite): Promise<'contained' | 'runner-absent' | 'runner-unavailable'> {
    const runner = declaredRunnerFile(suite.runner.command);
    if (!runner) return 'runner-unavailable';
    try {
      const root = await realpath(this.projectRoot);
      const candidate = path.resolve(root, runner.path);
      const relative = path.relative(root, candidate);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return 'runner-unavailable';
      const actual = await realpath(candidate);
      const actualRelative = path.relative(root, actual);
      return !actualRelative.startsWith('..') && !path.isAbsolute(actualRelative) && (await stat(candidate)).isFile()
        ? 'contained' : 'runner-unavailable';
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'runner-absent' : 'runner-unavailable';
    }
  }
  private log(event: { readonly event: string; readonly suiteId: string; readonly reason?: string; readonly durationMs?: number }): void {
    try { this.logger?.record(event); } catch { /* Logging cannot change a runner outcome. */ }
  }
}
