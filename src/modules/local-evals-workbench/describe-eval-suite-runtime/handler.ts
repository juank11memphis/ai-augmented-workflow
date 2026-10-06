import type { DescribeEvalSuiteRuntimeCommand } from './command.js';
import type { DescribeEvalSuiteRuntimeResult } from './result.js';
import type { PreviewLoggerPort, RunnerDescriptorPort, SuiteRuntimeRegistryPort } from './ports.js';
import { compatibleDescription, hasRubric, isDeclaredEnvironmentName, isSafeEnvironmentName, undeclaredEnvironmentName } from '../runtime-description.js';

export type DescribeEvalSuiteRuntimeDependencies = {
  readonly suites: SuiteRuntimeRegistryPort;
  readonly runner: RunnerDescriptorPort;
  readonly logger?: PreviewLoggerPort;
};
export async function describeEvalSuiteRuntime(
  command: DescribeEvalSuiteRuntimeCommand,
  dependencies: DescribeEvalSuiteRuntimeDependencies
): Promise<DescribeEvalSuiteRuntimeResult> {
  const started = Date.now();
  const log = (event: string, reason?: string): void => {
    try { dependencies.logger?.record({ event, suiteId: command.suiteId, reason, durationMs: Date.now() - started }); } catch { /* A log sink cannot change readiness. */ }
  };
  log('eval_runtime_describe_started');
  try {
    const suite = await dependencies.suites.load(command.suiteId);
    if (!suite) { log('eval_runtime_describe_blocked', 'suite-unavailable'); return { status: 'blocked', reason: 'suite-unavailable' }; }
    const described = await dependencies.runner.describe(suite);
    if (described.status === 'blocked') {
      log('eval_runtime_describe_blocked', described.reason);
      if (described.reason === 'environment-missing'
        && isDeclaredEnvironmentName(described.missingEnvironmentName, suite.runner.requiredEnvironment)) {
        return { status: 'blocked', reason: 'environment-missing', missingEnvironmentName: described.missingEnvironmentName };
      }
      if (described.reason === 'required-setting-rejected'
        && isDeclaredEnvironmentName(described.rejectedSettingName, suite.runner.requiredEnvironment)) {
        return { status: 'blocked', reason: 'required-setting-rejected', rejectedSettingName: described.rejectedSettingName };
      }
      return { status: 'blocked', reason: described.reason };
    }
    const reason = compatibleDescription(suite, described.value);
    if (reason) {
      log('eval_runtime_describe_blocked', reason);
      if (reason === 'environment-undeclared') {
        const name = undeclaredEnvironmentName(suite, described.value);
        return { status: 'blocked', reason, ...(isSafeEnvironmentName(name) ? { undeclaredEnvironmentName: name } : {}) };
      }
      return { status: 'blocked', reason };
    }
    log('eval_runtime_describe_completed');
    return { status: 'ready', suiteId: suite.id, models: described.value.models, judgeModels: described.value.judgeModels,
      rubricRequired: hasRubric(suite.testCases), rubricCaseIds: suite.testCases.filter((testCase) => hasRubric([testCase])).map((testCase) => testCase.id) };
  } catch {
    log('eval_runtime_describe_blocked', 'runner-unavailable');
    return { status: 'blocked', reason: 'runner-unavailable' };
  }
}
