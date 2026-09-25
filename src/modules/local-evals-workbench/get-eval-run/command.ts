import type { Selection } from '../run-history/contracts.js';
export type GetEvalRunCommand = { readonly suiteId: string; readonly runId: string; readonly selection?: Selection; };
