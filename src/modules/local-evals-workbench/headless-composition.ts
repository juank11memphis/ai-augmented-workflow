import { discoverConventionalEvalSuites, NodeEvalSuiteDiscoveryReader, toPublicEvalSuiteDiscoveryResult } from './discover-conventional-eval-suites/index.js';
import { describeEvalSuiteRuntime } from './describe-eval-suite-runtime/index.js';
import { headlessEvalRun } from './headless-eval-run/index.js';
import { headlessEvalResult } from './headless-eval-result/index.js';
import type { DescribeEvalSuiteRuntimeCommand } from './describe-eval-suite-runtime/index.js';
import type { HeadlessEvalRunCommand } from './headless-eval-run/index.js';
import type { HeadlessEvalResultCommand } from './headless-eval-result/index.js';
import { ProjectSuiteRuntimeRegistry } from './suite-runtime-registry.js';
import { ProjectRunnerProcessAdapter } from './runner-process/process-adapter.js';
import { ProjectRunnerExecuteAdapter } from './runner-process/execute-adapter.js';
import { PreviewArtifactReadiness } from './preview-artifact-readiness.js';
import { resolveSuiteInputs } from './resolved-suite-inputs.js';
import { createRunHistory } from './run-history/composition.js';
import { executeEvalRun } from './execute-eval-run/index.js';
import { evaluateOutputAssertions } from './run-execution/output-assertions.js';
import { loadEvalEnvironment } from './eval-environment.js';

/** One process per project: the shared artifact index is not cross-process safe. */
export async function createHeadlessWorkbench(projectRoot: string) {
  const discovery = await discoverConventionalEvalSuites({ type: 'discover-conventional-eval-suites', projectRoot },
    { discoveryReader: new NodeEvalSuiteDiscoveryReader(), logger: { info() {}, warn() {} } });
  const environment = loadEvalEnvironment(projectRoot);
  const suites = new ProjectSuiteRuntimeRegistry(projectRoot);
  const runner = new ProjectRunnerProcessAdapter(projectRoot, undefined, environment);
  const executor = new ProjectRunnerExecuteAdapter(projectRoot, undefined, environment);
  const history = createRunHistory(projectRoot);
  const artifacts = new PreviewArtifactReadiness(projectRoot);
  const inputs = { resolve: (cases: Parameters<typeof resolveSuiteInputs>[1]) => resolveSuiteInputs(projectRoot, cases) };
  return {
    discover: () => toPublicEvalSuiteDiscoveryResult(discovery),
    describe: (command: DescribeEvalSuiteRuntimeCommand) => describeEvalSuiteRuntime(command, { suites, runner }),
    run: (command: HeadlessEvalRunCommand) => headlessEvalRun(command, { suites, runner, artifacts, inputs,
      store: history.store, reader: { get: (suiteId, runId, selection) =>
        history.get({ suiteId, runId, ...(selection ? { selection } : {}) }) },
      executor: { execute: async selection => {
        const result = await executeEvalRun({ ...selection, suitePath: discovery.sourceBySuiteId?.[selection.suite.id] },
          { runner: executor, store: history.store, evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now });
        if (result.status === 'queued' || result.status === 'running')
          return { status: 'storage-failed' as const, runId: result.runId, reason: 'nonterminal-artifact' };
        return { status: result.status, runId: result.runId, ...(result.reason ? { reason: result.reason } : {}) };
      } },
    }),
    result: (command: HeadlessEvalResultCommand) => headlessEvalResult(command, { reader: { get: (suiteId, runId, selection) =>
      history.get({ suiteId, runId, ...(selection ? { selection } : {}) }) } }),
  };
}
