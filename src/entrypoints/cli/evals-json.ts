import { createHeadlessWorkbench } from '../../modules/local-evals-workbench/index.js';
import type { SibuCliCommand } from './command.js';

type EvalCliCommand = Extract<SibuCliCommand, { type: 'evals:suites' | 'evals:describe' | 'evals:run' | 'evals:choice' | 'evals:result' }>;
type Workbench = Awaited<ReturnType<typeof createHeadlessWorkbench>>;
type Output = { readonly write: (line: string) => void; readonly setExitCode: (code: number) => void };

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function invalidReason(command: EvalCliCommand): string | undefined {
  if ('suiteId' in command && !SAFE_ID.test(command.suiteId)) return 'invalid-suite-id';
  if (command.type === 'evals:describe' && command.caseId !== undefined && !SAFE_ID.test(command.caseId)) return 'invalid-case-id';
  if (command.type === 'evals:run') {
    if (command.scope.type === 'test_case' && !SAFE_ID.test(command.scope.testCaseId)) return 'invalid-case-id';
    if (command.model !== undefined && !command.model.trim()) return 'invalid-model';
    if (command.judgeModel !== undefined && command.judgeModel !== null && !command.judgeModel.trim()) return 'invalid-judge-model';
  }
  if (command.type === 'evals:choice') {
    if (command.role !== 'tested' && command.role !== 'judge') return 'invalid-role';
    if (command.action !== 'set' && command.action !== 'reset') return 'invalid-action';
    if (!/^[a-f0-9]{64}$/.test(command.expectedToken)) return 'invalid-token';
    if (command.action === 'set' && !command.modelId) return 'model-required';
    if (command.action === 'reset' && command.modelId !== undefined) return 'set-and-reset-conflict';
  }
  if (command.type === 'evals:result') {
    if (!SAFE_ID.test(command.runId)) return 'invalid-run-id';
    if ((command.caseId === undefined) !== (command.assertionId === undefined)) return 'case-and-assertion-required-together';
    if (command.caseId !== undefined && !SAFE_ID.test(command.caseId)) return 'invalid-case-id';
    if (command.assertionId !== undefined && !SAFE_ID.test(command.assertionId)) return 'invalid-assertion-id';
  }
  return undefined;
}

function nextAction(result: { readonly status?: unknown; readonly reason?: unknown; readonly role?: unknown; readonly caseId?: unknown }): string | undefined {
  if (result.status === 'conflict') return 'Describe the suite again, then explicitly retry the saved choice.';
  if (result.status !== 'blocked') return undefined;
  if (result.reason === 'missing-suite-default') return `Set the suite ${result.role} default with evals choice, then retry.`;
  if (result.reason === 'saved-model-unavailable') return `Replace the saved ${result.role} model${result.caseId ? ` for case ${result.caseId}` : ''} explicitly, then retry.`;
  if (result.reason === 'run-only-scope-unsupported') return 'Remove the run-only model flags for a full-suite run.';
  if (result.reason === 'run-only-model-unavailable' || result.reason === 'invalid-run-only-choice') return 'Choose a compatible this-run-only model for one case or omit the run-only flags.';
  if (result.reason === 'model-unavailable') return 'Describe compatible models, then explicitly set another saved choice.';
  return undefined;
}

function succeeded(operation: string, result: unknown): boolean {
  if (typeof result !== 'object' || result === null || !('status' in result)) return false;
  if (result.status === 'completed') return 'outcome' in result && result.outcome === 'passed';
  if (result.status === 'saved') return true;
  if (result.status !== 'ready') return false;
  if (operation === 'result') return true;
  return true;
}

export async function handleEvalsJsonCommand(
  command: EvalCliCommand,
  dependencies: { readonly create: (root: string) => Promise<Workbench>; readonly root: string; readonly output: Output } = {
    create: createHeadlessWorkbench, root: process.cwd(),
    output: { write: (line) => process.stdout.write(`${line}\n`), setExitCode: (code) => { process.exitCode = code; } },
  },
): Promise<void> {
  const operation = command.type.slice('evals:'.length);
  const invalid = invalidReason(command);
  if (invalid) {
    dependencies.output.write(JSON.stringify({ schemaVersion: 1, operation, status: 'blocked', reason: invalid }));
    dependencies.output.setExitCode(1);
    return;
  }
  try {
    const workbench = await dependencies.create(dependencies.root);
    const result = command.type === 'evals:suites' ? workbench.discover()
      : command.type === 'evals:describe' ? await workbench.describe({ suiteId: command.suiteId, ...(command.caseId ? { caseId: command.caseId } : {}) })
      : command.type === 'evals:run' ? await workbench.run({ suiteId: command.suiteId, scope: command.scope,
        ...(command.model !== undefined ? { model: command.model } : {}), ...(command.judgeModel !== undefined ? { judgeModel: command.judgeModel } : {}) })
      : command.type === 'evals:choice' ? await workbench.changeChoice({ suiteId: command.suiteId, role: command.role,
        action: command.action, expectedToken: command.expectedToken, ...(command.modelId !== undefined ? { modelId: command.modelId } : {}) })
      : await workbench.result({ suiteId: command.suiteId, runId: command.runId,
        ...(command.caseId && command.assertionId ? { selection: { caseId: command.caseId, attempt: 1 as const, assertionId: command.assertionId } } : {}) });
    dependencies.output.write(JSON.stringify({ schemaVersion: 1, operation, ...result, ...('status' in result && nextAction(result) ? { nextAction: nextAction(result) } : {}) }));
    if (!succeeded(operation, result)) dependencies.output.setExitCode(1);
  } catch {
    dependencies.output.write(JSON.stringify({ schemaVersion: 1, operation, status: 'error', reason: 'unexpected-error' }));
    dependencies.output.setExitCode(1);
  }
}
