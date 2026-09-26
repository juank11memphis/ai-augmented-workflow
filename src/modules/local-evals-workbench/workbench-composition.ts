import { DiscoveredEvalSuiteRegistry, InMemoryRunArtifactStore, UnavailableVersion2EvalSuiteRunner } from './run-local-eval-suite/index.js';
import type { RunLocalEvalSuiteDependencies } from './run-local-eval-suite/index.js';
import { EnvironmentAssistanceConfig, OpenAiFailureAnalysisAdapter } from './analyze-failed-assertion/index.js';
import type { AnalyzeFailedAssertionDependencies } from './analyze-failed-assertion/index.js';
import { InMemoryRepairProposalStore, NodeSafeProjectFileReader, OpenAiRepairProposalAdapter } from './draft-eval-repair-proposal/index.js';
import type { DraftEvalRepairProposalDependencies } from './draft-eval-repair-proposal/index.js';
import { NodeSafeProjectFileMutator, RepairProposalStoreReadinessAdapter, SibuManagedWorkflowReadinessAdapter } from './apply-approved-eval-repair/index.js';
import type { ApplyApprovedEvalRepairDependencies } from './apply-approved-eval-repair/index.js';
import type { LocalWorkbenchServerStartRequest } from './start-local-evals-workbench/ports.js';
import type { DescribeEvalSuiteRuntimeDependencies } from './describe-eval-suite-runtime/index.js';
import type { PreviewEvalRunDependencies } from './preview-eval-run/index.js';
import { ProjectSuiteRuntimeRegistry } from './suite-runtime-registry.js';
import { ProjectRunnerProcessAdapter } from './runner-process/process-adapter.js';
import { PreviewArtifactReadiness } from './preview-artifact-readiness.js';
import { resolveSuiteInputs } from './resolved-suite-inputs.js';
import { createRunHistory } from './run-history/composition.js';
import { executeEvalRun } from './execute-eval-run/index.js';
import type { StartEvalRunDependencies } from './start-eval-run/index.js';
import type { GetEvalRunCommand, GetEvalRunResult } from './get-eval-run/index.js';
import { ProjectRunnerExecuteAdapter } from './runner-process/execute-adapter.js';
import { evaluateOutputAssertions } from './run-execution/output-assertions.js';

export type LocalWorkbenchRuntimeDependencies = {
  readonly run: RunLocalEvalSuiteDependencies;
  readonly analysis: AnalyzeFailedAssertionDependencies;
  readonly proposal: DraftEvalRepairProposalDependencies;
  readonly applyRepair: ApplyApprovedEvalRepairDependencies;
  readonly describe?: DescribeEvalSuiteRuntimeDependencies;
  readonly preview?: PreviewEvalRunDependencies;
  readonly start?: StartEvalRunDependencies;
  readonly get?: (command: GetEvalRunCommand) => Promise<GetEvalRunResult>;
};

export function createWorkbenchDependencies(request: LocalWorkbenchServerStartRequest): LocalWorkbenchRuntimeDependencies {
  const artifactStore = new InMemoryRunArtifactStore();
  const logger = { info: console.info, warn: console.warn, error: console.error };
  const assistanceConfig = new EnvironmentAssistanceConfig();
  const config = assistanceConfig.getConfig();
  const proposalStore = new InMemoryRepairProposalStore();
  const fileMutator = new NodeSafeProjectFileMutator();
  const suites = new ProjectSuiteRuntimeRegistry(request.projectRoot);
  const previewLogger = { record: (event: { readonly event: string; readonly suiteId?: string; readonly reason?: string; readonly durationMs?: number }): void => {
    try { console.info(event); } catch { /* Noncritical sink. */ }
  } };
  const runner = new ProjectRunnerProcessAdapter(request.projectRoot, undefined, process.env, previewLogger);
  const history = createRunHistory(request.projectRoot, { log: line => console.info(line) });
  const executor = new ProjectRunnerExecuteAdapter(request.projectRoot, undefined, process.env, previewLogger);
  const readiness = new PreviewArtifactReadiness(request.projectRoot);
  const inputs = { resolve: (cases: Parameters<typeof resolveSuiteInputs>[1]) => resolveSuiteInputs(request.projectRoot, cases) };
  return {
    run: { suiteRegistry: new DiscoveredEvalSuiteRegistry(request.initialDiscoveryResult.definitions), evalRunner: new UnavailableVersion2EvalSuiteRunner(), artifactStore, logger },
    analysis: { artifactReader: artifactStore, assistanceConfig, llm: new OpenAiFailureAnalysisAdapter(config.apiKey ?? ''), logger },
    proposal: { artifactReader: artifactStore, assistanceConfig, projectFileReader: new NodeSafeProjectFileReader(), llm: new OpenAiRepairProposalAdapter(config.apiKey ?? ''), proposalStore, logger },
    applyRepair: { proposalReader: new RepairProposalStoreReadinessAdapter(proposalStore), safety: fileMutator, workflowReadiness: new SibuManagedWorkflowReadinessAdapter(), mutator: fileMutator, logger },
    describe: { suites, runner, logger: previewLogger },
    preview: { suites, runner, artifacts: readiness, inputs, logger: previewLogger },
    start: { suites, runner, artifacts: readiness, inputs, store: history.store, logger: previewLogger,
      scheduler: { schedule(selection) {
        queueMicrotask(() => {
          void executeEvalRun(selection, { runner: executor, store: history.store,
            evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now, logger: previewLogger })
            .catch(() => { try { previewLogger.record({ event: 'eval_run_background_failed', suiteId: selection.suite.id, reason: 'unavailable' }); } catch { /* Noncritical sink. */ } });
        });
      } },
    },
    get: command => history.get(command),
  };
}
