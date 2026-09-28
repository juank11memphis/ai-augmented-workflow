import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/suite-contract.js';
import type { DraftEvalRepairProposalCommand } from '../draft-eval-repair-proposal/command.js';

export type NamedProposalContext = { readonly status: 'ready'; readonly paths: readonly string[] }
  | { readonly status: 'blocked'; readonly reason: string };

export function namedProposalContext(
  suites: readonly NormalizedEvalSuite[],
  sourceBySuiteId: Readonly<Record<string, string>> | undefined,
  command: DraftEvalRepairProposalCommand
): NamedProposalContext {
  const suite = suites.find(item => item.id === command.suiteId);
  const source = sourceBySuiteId?.[command.suiteId];
  const selectedCase = suite?.testCases.find(item => item.id === command.testCaseId);
  if (!suite || !selectedCase || !source || !/^evals\/[A-Za-z0-9._-]+\.json$/.test(source)) {
    return { status: 'blocked', reason: 'Validated suite and selected case source are unavailable.' };
  }
  if (command.repairDirection.type === 'prompt_issue') return { status: 'ready', paths: [suite.target.path] };
  if (command.repairDirection.type === 'fixture_input_issue') {
    if (selectedCase.fixture?.type !== 'file') return { status: 'blocked', reason: 'This case has no named fixture file to repair.' };
    return { status: 'ready', paths: [`evals/${selectedCase.fixture.path}`, source] };
  }
  if (command.repairDirection.type === 'eval_assertion_issue' || command.repairDirection.type === 'regression_case') {
    return { status: 'ready', paths: [source] };
  }
  return { status: 'blocked', reason: 'A named repair target could not be established from this suite.' };
}
