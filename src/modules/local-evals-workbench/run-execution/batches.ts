import type { ExecutionSelection, OrderedRunPlan } from './contracts.js';
import { orderedRunPlan } from './contracts.js';

export type ExecutionBatch = ExecutionSelection & { readonly caseSelections: OrderedRunPlan };

/** Validate the complete scope before a runner request can incur cost. */
export function executionBatches(selection: ExecutionSelection): readonly ExecutionBatch[] | undefined {
  const ids = selection.cases.map(item => item.id);
  const choices = selection.caseSelections ?? selection.cases.map(item => ({
    caseId: item.id, testedModel: selection.model, judgeModel: selection.judgeModel ?? null,
  }));
  const plan = orderedRunPlan(ids, choices);
  if (!plan || selection.suite.testCases.length === 0 || selection.cases.some(item =>
    !selection.suite.testCases.some(source => source.id === item.id))) return undefined;
  if (selection.caseSelections === undefined && selection.cases.some(item =>
    item.graders.some(grader => grader.type === 'rubric') !== (selection.judgeModel != null))) return undefined;
  if (plan.some((choice, index) => itemNeedsJudge(selection.cases[index]!) !== (choice.judgeModel !== null))) return undefined;

  const batches: ExecutionBatch[] = [];
  let first = 0;
  while (first < plan.length) {
    let end = first + 1;
    while (end < plan.length && plan[end]!.testedModel === plan[first]!.testedModel
      && plan[end]!.judgeModel === plan[first]!.judgeModel) end++;
    batches.push({ ...selection, cases: selection.cases.slice(first, end),
      model: plan[first]!.testedModel, judgeModel: plan[first]!.judgeModel, caseSelections: plan.slice(first, end) });
    first = end;
  }
  return batches;
}

function itemNeedsJudge(item: ExecutionSelection['cases'][number]): boolean {
  return item.graders.some(grader => grader.type === 'rubric');
}
