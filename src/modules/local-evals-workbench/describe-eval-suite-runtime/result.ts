import type { RuntimeBlockReason, RuntimeDescription } from '../runtime-description.js';
export type DescribeEvalSuiteRuntimeResult =
  | { readonly status: 'ready'; readonly suiteId: string; readonly models: RuntimeDescription['models']; readonly judgeModels: RuntimeDescription['judgeModels']; readonly rubricRequired: boolean; readonly rubricCaseIds: readonly string[]; readonly costEstimation: boolean }
  | { readonly status: 'blocked'; readonly reason: RuntimeBlockReason };
