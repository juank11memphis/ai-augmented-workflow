import { DiscoveredEvalSuiteRegistry, InMemoryRunArtifactStore, UnavailableVersion2EvalSuiteRunner } from './run-local-eval-suite/index.js';
import type { RunLocalEvalSuiteDependencies } from './run-local-eval-suite/index.js';
import { EnvironmentAssistanceConfig, OpenAiFailureAnalysisAdapter } from './analyze-failed-assertion/index.js';
import type { AnalyzeFailedAssertionDependencies } from './analyze-failed-assertion/index.js';
import { InMemoryRepairProposalStore, NodeSafeProjectFileReader, OpenAiRepairProposalAdapter } from './draft-eval-repair-proposal/index.js';
import type { DraftEvalRepairProposalDependencies } from './draft-eval-repair-proposal/index.js';
import type { DraftRepairProposalLogEvent } from './draft-eval-repair-proposal/ports.js';
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
import type { PreviewLoggerPort } from './runtime-ports.js';
import type { ExecutionDiagnostic, ExecutionLoggerPort } from './execute-eval-run/ports.js';
import { logicalId } from './run-history/validation.js';
import type { GetEvalRunCommand, GetEvalRunResult } from './get-eval-run/index.js';
import type { ListEvalRunsCommand, ListEvalRunsResult } from './list-eval-runs/index.js';
import { ProjectRunnerExecuteAdapter } from './runner-process/execute-adapter.js';
import { evaluateOutputAssertions } from './run-execution/output-assertions.js';
import { createSelectedFailureReader } from './repair-context/selected-evidence.js';
import { namedProposalContext } from './repair-context/proposal-context-adapter.js';
import { InMemoryFailureAnalysisStore } from './repair-context/analysis-store.js';
import { loadEvalEnvironment } from './eval-environment.js';

export type LocalWorkbenchRuntimeDependencies = {
  readonly run: RunLocalEvalSuiteDependencies;
  readonly analysis: AnalyzeFailedAssertionDependencies;
  readonly proposal: DraftEvalRepairProposalDependencies;
  readonly applyRepair: ApplyApprovedEvalRepairDependencies;
  readonly describe?: DescribeEvalSuiteRuntimeDependencies;
  readonly preview?: PreviewEvalRunDependencies;
  readonly start?: StartEvalRunDependencies;
  readonly get?: (command: GetEvalRunCommand) => Promise<GetEvalRunResult>;
  readonly list?: (command: ListEvalRunsCommand) => Promise<ListEvalRunsResult>;
};

export function createWorkbenchDependencies(request: LocalWorkbenchServerStartRequest): LocalWorkbenchRuntimeDependencies {
  const artifactStore = new InMemoryRunArtifactStore();
  const logger = { info: console.info, warn: console.warn, error: console.error };
  const proposalLogger = {
    info: (event: DraftRepairProposalLogEvent) => console.info(JSON.stringify(event)),
    warn: (event: DraftRepairProposalLogEvent) => console.warn(JSON.stringify(event)),
    error: (event: DraftRepairProposalLogEvent) => console.error(JSON.stringify(event)),
  };
  const environment = loadEvalEnvironment(request.projectRoot);
  const assistanceConfig = new EnvironmentAssistanceConfig(environment);
  const config = assistanceConfig.getConfig();
  const proposalStore = new InMemoryRepairProposalStore();
  const analysisStore = new InMemoryFailureAnalysisStore();
  const fileMutator = new NodeSafeProjectFileMutator();
  const suites = new ProjectSuiteRuntimeRegistry(request.projectRoot);
  const previewLogger = { record: (event: { readonly event: string; readonly suiteId?: string; readonly reason?: string; readonly durationMs?: number }): void => {
    try { console.info(event); } catch { /* Noncritical sink. */ }
  } };
  const runner = new ProjectRunnerProcessAdapter(request.projectRoot, undefined, environment, previewLogger);
  const history = createRunHistory(request.projectRoot, { log: line => console.info(line) });
  const executor = new ProjectRunnerExecuteAdapter(request.projectRoot, undefined, environment, previewLogger);
  const readiness = new PreviewArtifactReadiness(request.projectRoot);
  const inputs = { resolve: (cases: Parameters<typeof resolveSuiteInputs>[1]) => resolveSuiteInputs(request.projectRoot, cases) };
  return {
    run: { suiteRegistry: new DiscoveredEvalSuiteRegistry(request.initialDiscoveryResult.definitions), evalRunner: new UnavailableVersion2EvalSuiteRunner(), artifactStore, logger },
    analysis: { artifactReader: createSelectedFailureReader(history.get), assistanceConfig, llm: new OpenAiFailureAnalysisAdapter(config.apiKey ?? ''), analysisStore, logger },
    proposal: { artifactReader: createSelectedFailureReader(history.get), assistanceConfig, analysisStore, context: { namedFiles: command => namedProposalContext(request.initialDiscoveryResult.definitions, request.initialDiscoveryResult.sourceBySuiteId, command) }, projectFileReader: new NodeSafeProjectFileReader(), llm: new OpenAiRepairProposalAdapter(config.apiKey ?? ''), proposalStore, logger: proposalLogger },
    applyRepair: { proposalReader: new RepairProposalStoreReadinessAdapter(proposalStore), safety: fileMutator, workflowReadiness: new SibuManagedWorkflowReadinessAdapter(), mutator: fileMutator, logger },
    describe: { suites, runner, logger: previewLogger },
    preview: { suites, runner, artifacts: readiness, inputs, logger: previewLogger },
    start: { suites, runner, artifacts: readiness, inputs, store: history.store,
      logger: { record: event => { try { console.info(JSON.stringify(event)); } catch { /* Noncritical sink. */ } } },
      scheduler: { schedule(selection) {
        queueMicrotask(() => {
          const backgroundLogger: ExecutionLoggerPort = { record(event) {
            try {
              console.info(JSON.stringify(safeExecutionEvent(event, selection.reference, selection.runId)));
            } catch { /* Noncritical sink. */ }
          } };
          void executeEvalRun(selection, { runner: executor, store: history.store,
            evaluator: { evaluate: evaluateOutputAssertions }, clock: Date.now, logger: backgroundLogger })
            .catch(() => { try { console.info(JSON.stringify({ event: 'eval_run_background_failed', stage: 'execution', outcome: 'failed',
              reason: 'unavailable', ...(selection.reference ? { reference: selection.reference } : {}),
              ...(logicalId(selection.runId) ? { runId: selection.runId } : {}) })); } catch { /* Noncritical sink. */ } });
        });
      } },
    },
    get: command => history.get(command),
    list: command => history.list(command),
  };
}

export function safeExecutionEvent(event: ExecutionDiagnostic, reference: string | undefined, runId: string): Record<string, string | number> {
  const safeReasons = new Set(['completed', 'error', 'interrupted', 'runner-timeout', 'runner-protocol-invalid',
    'runner-exited', 'runner-start-failed', 'runner-absent', 'runner-unavailable', 'unavailable',
    'required-setting-rejected', 'runner-request-too-large', 'environment-missing', 'environment-undeclared',
    'runner-limit', 'evidence-limit-exceeded', 'invalid-transition', 'limit-exceeded', 'corrupt']);
  return { event: event.event, stage: 'execution', outcome: event.outcome,
    ...(event.reason && safeReasons.has(event.reason) ? { reason: event.reason } : {}),
    ...(reference && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(reference) ? { reference } : {}),
    ...(logicalId(runId) ? { runId } : {}),
    ...(Number.isFinite(event.durationMs) && event.durationMs >= 0 ? { durationMs: event.durationMs } : {}) };
}
