import { createHeadlessWorkbench } from '../../modules/local-evals-workbench/index.js';
import type { SibuCliCommand } from './command.js';

type EvalCliCommand = Extract<SibuCliCommand, { type: 'evals:suites' | 'evals:describe' | 'evals:run' | 'evals:result' }>;
type Workbench = Awaited<ReturnType<typeof createHeadlessWorkbench>>;
type Output = { readonly write: (line: string) => void; readonly setExitCode: (code: number) => void };

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function invalidReason(command: EvalCliCommand): string | undefined {
  if ('suiteId' in command && !SAFE_ID.test(command.suiteId)) return 'invalid-suite-id';
  if (command.type === 'evals:describe' && command.caseId !== undefined && !SAFE_ID.test(command.caseId)) return 'invalid-case-id';
  if (command.type === 'evals:run') {
    if (command.scope.type === 'test_case' && !SAFE_ID.test(command.scope.testCaseId)) return 'invalid-case-id';
    if (!command.model.trim()) return 'model-required';
    if (command.judgeModel !== undefined && command.judgeModel !== null && !command.judgeModel.trim()) return 'invalid-judge-model';
  }
  if (command.type === 'evals:result') {
    if (!SAFE_ID.test(command.runId)) return 'invalid-run-id';
    if ((command.caseId === undefined) !== (command.assertionId === undefined)) return 'case-and-assertion-required-together';
    if (command.caseId !== undefined && !SAFE_ID.test(command.caseId)) return 'invalid-case-id';
    if (command.assertionId !== undefined && !SAFE_ID.test(command.assertionId)) return 'invalid-assertion-id';
  }
  return undefined;
}

function succeeded(operation: string, result: unknown): boolean {
  if (typeof result !== 'object' || result === null || !('status' in result)) return false;
  if (result.status === 'completed') return 'outcome' in result && result.outcome === 'passed';
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
      : command.type === 'evals:run' ? await workbench.run({ suiteId: command.suiteId, scope: command.scope, model: command.model, judgeModel: command.judgeModel })
      : await workbench.result({ suiteId: command.suiteId, runId: command.runId,
        ...(command.caseId && command.assertionId ? { selection: { caseId: command.caseId, attempt: 1 as const, assertionId: command.assertionId } } : {}) });
    dependencies.output.write(JSON.stringify({ schemaVersion: 1, operation, ...result }));
    if (!succeeded(operation, result)) dependencies.output.setExitCode(1);
  } catch {
    dependencies.output.write(JSON.stringify({ schemaVersion: 1, operation, status: 'error', reason: 'unexpected-error' }));
    dependencies.output.setExitCode(1);
  }
}
