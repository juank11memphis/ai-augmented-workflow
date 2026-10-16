import { createHash } from 'node:crypto';
import type { NormalizedEvalSuite } from './discover-conventional-eval-suites/index.js';
import type { RuntimeDescription } from './runtime-description.js';
import type { ResolveEvalRunSelectionCommand } from './resolve-eval-run-selection/command.js';
import { resolveEvalRunSelection } from './resolve-eval-run-selection/handler.js';
import type { ResolveEvalRunSelectionResult } from './resolve-eval-run-selection/result.js';
import type { ResolveEvalRunSelectionPorts } from './resolve-eval-run-selection/ports.js';

/** One resolver invocation captures exactly the suite and description used for a decision. */
export async function resolveRunSnapshot(command: ResolveEvalRunSelectionCommand, ports: ResolveEvalRunSelectionPorts): Promise<{
  readonly selection: ResolveEvalRunSelectionResult;
  readonly suite?: NormalizedEvalSuite;
  readonly previewToken?: string;
}> {
  let suite: NormalizedEvalSuite | undefined;
  let description: RuntimeDescription | undefined;
  const selection = await resolveEvalRunSelection(command, {
    suites: { load: async id => { suite = await ports.suites.load(id); return suite; } },
    runner: { describe: async loaded => {
      const result = await ports.runner.describe(loaded);
      if (result.status === 'ready') description = result.value;
      return result;
    } },
  });
  const previewToken = selection.status === 'ready' && suite && description
    ? createHash('sha256').update(JSON.stringify({ suite, description, selection: selection.cases })).digest('hex')
    : undefined;
  return { selection, ...(suite ? { suite } : {}), ...(previewToken ? { previewToken } : {}) };
}
