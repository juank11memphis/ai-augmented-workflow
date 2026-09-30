import type { NormalizedEvalSuite, NormalizedEvalTestCase } from './discover-conventional-eval-suites/index.js';

export const RUNNER_CAPABILITIES = ['single-turn', 'multi-turn', 'tool-mocks', 'custom', 'rubric'] as const;
export type RunnerCapability = typeof RUNNER_CAPABILITIES[number];
export type RuntimeDescription = {
  readonly runnerId: string;
  readonly capabilities: readonly RunnerCapability[];
  readonly models: readonly string[];
  readonly judgeModels: readonly string[];
  readonly requiredEnvironment: readonly string[];
  readonly costEstimation: boolean;
};

export type RuntimeBlockReason =
  | 'suite-unavailable' | 'runner-unavailable' | 'runner-invalid' | 'runner-timeout'
  | 'environment-missing' | 'environment-undeclared' | 'capability-unsupported'
  | 'model-unavailable' | 'judge-unavailable' | 'case-unavailable'
  | 'repeats-invalid' | 'artifact-unsafe' | 'artifact-not-ignored' | 'artifact-tracked'
  | 'artifact-git-unavailable' | 'artifact-root-unsafe' | 'estimate-invalid' | 'input-unsafe';

export type RuntimeBlock =
  | { readonly status: 'blocked'; readonly reason: 'environment-missing'; readonly missingEnvironmentName?: string }
  | { readonly status: 'blocked'; readonly reason: Exclude<RuntimeBlockReason, 'environment-missing'> };

export type RuntimeOutcome<T> =
  | { readonly status: 'ready'; readonly value: T }
  | RuntimeBlock;

export function isDeclaredEnvironmentName(name: unknown, declared: readonly string[]): name is string {
  return typeof name === 'string' && /^[A-Z_][A-Z0-9_]*$/.test(name) && declared.includes(name);
}

export function requiredCapabilities(cases: readonly NormalizedEvalTestCase[]): readonly RunnerCapability[] {
  const capabilities = new Set<RunnerCapability>();
  for (const testCase of cases) {
    capabilities.add(testCase.turns.length > 1 ? 'multi-turn' : 'single-turn');
    if (testCase.toolMocks.length) capabilities.add('tool-mocks');
    if (testCase.graders.some((grader) => grader.type === 'custom')) capabilities.add('custom');
    if (testCase.graders.some((grader) => grader.type === 'rubric')) capabilities.add('rubric');
  }
  return [...capabilities];
}

export function hasRubric(cases: readonly NormalizedEvalTestCase[]): boolean {
  return cases.some((testCase) => testCase.graders.some((grader) => grader.type === 'rubric'));
}

export function compatibleDescription(suite: NormalizedEvalSuite, description: RuntimeDescription): RuntimeBlockReason | undefined {
  if (requiredCapabilities(suite.testCases).some((capability) => !description.capabilities.includes(capability))) return 'capability-unsupported';
  if (!description.models.length) return 'model-unavailable';
  if (hasRubric(suite.testCases) && !description.judgeModels.length) return 'judge-unavailable';
  if (description.requiredEnvironment.some((name) => !suite.runner.requiredEnvironment.includes(name))) return 'environment-undeclared';
}
