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

export type LocalWorkbenchRuntimeDependencies = {
  readonly run: RunLocalEvalSuiteDependencies;
  readonly analysis: AnalyzeFailedAssertionDependencies;
  readonly proposal: DraftEvalRepairProposalDependencies;
  readonly applyRepair: ApplyApprovedEvalRepairDependencies;
  readonly describe?: DescribeEvalSuiteRuntimeDependencies;
  readonly preview?: PreviewEvalRunDependencies;
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
  return {
    run: { suiteRegistry: new DiscoveredEvalSuiteRegistry(request.initialDiscoveryResult.definitions), evalRunner: new UnavailableVersion2EvalSuiteRunner(), artifactStore, logger },
    analysis: { artifactReader: artifactStore, assistanceConfig, llm: new OpenAiFailureAnalysisAdapter(config.apiKey ?? ''), logger },
    proposal: { artifactReader: artifactStore, assistanceConfig, projectFileReader: new NodeSafeProjectFileReader(), llm: new OpenAiRepairProposalAdapter(config.apiKey ?? ''), proposalStore, logger },
    applyRepair: { proposalReader: new RepairProposalStoreReadinessAdapter(proposalStore), safety: fileMutator, workflowReadiness: new SibuManagedWorkflowReadinessAdapter(), mutator: fileMutator, logger },
    describe: { suites, runner, logger: previewLogger },
    preview: { suites, runner, artifacts: new PreviewArtifactReadiness(request.projectRoot), inputs: { resolve: (cases) => resolveSuiteInputs(request.projectRoot, cases) }, logger: previewLogger },
  };
}
