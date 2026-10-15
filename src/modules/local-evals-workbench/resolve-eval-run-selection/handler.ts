import type { NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import { requiredCapabilities, undeclaredEnvironmentName } from '../runtime-description.js';
import type { RuntimeDescription } from '../runtime-description.js';
import type { ResolveEvalRunSelectionCommand, RunOnlyModelChoice } from './command.js';
import type { ResolveEvalRunSelectionPorts } from './ports.js';
import type { ModelRole, ResolveEvalRunSelectionResult, SelectionBlockReason } from './result.js';

const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;

export async function resolveEvalRunSelection(
  command: ResolveEvalRunSelectionCommand,
  ports: ResolveEvalRunSelectionPorts,
): Promise<ResolveEvalRunSelectionResult> {
  const blocked = (reason: SelectionBlockReason, caseId?: string, role?: ModelRole): ResolveEvalRunSelectionResult => ({
    status: 'blocked', reason, suiteId: command.suiteId,
    ...(caseId ? { caseId } : {}), ...(role ? { role } : {}),
  });
  if (!validScope(command.scope)) return blocked('case-unavailable');
  if (command.runOnly !== undefined) {
    if (command.scope.type === 'all') return blocked('run-only-scope-unsupported');
    const invalidRole = invalidRunOnlyRole(command.runOnly);
    if (invalidRole) return blocked('invalid-run-only-choice', command.scope.type === 'test_case' ? command.scope.testCaseId : undefined, invalidRole);
  }

  let suite;
  try { suite = await ports.suites.load(command.suiteId); }
  catch { return blocked('suite-unavailable'); }
  if (!suite) return blocked('suite-unavailable');
  const caseId = command.scope.type === 'test_case' ? command.scope.testCaseId : undefined;
  const cases = caseId === undefined ? suite.testCases : suite.testCases.filter((item) => item.id === caseId);
  if (!cases.length) return blocked('case-unavailable', command.scope.type === 'test_case' ? command.scope.testCaseId : undefined);

  // A temporary choice cannot repair an unset suite default, even for one case.
  if (!suite.defaultTestedModel) return blocked('missing-suite-default', cases[0]?.id, 'tested');
  const firstRubric = cases.find(needsJudge);
  if (firstRubric && !suite.defaultJudgeModel) return blocked('missing-suite-default', firstRubric.id, 'judge');

  let described;
  try { described = await ports.runner.describe(suite); }
  catch { return blocked('runner-unavailable'); }
  if (described.status === 'blocked') return blocked(described.reason);
  const description = described.value;
  if (requiredCapabilities(cases).some((capability) => !description.capabilities.includes(capability))) return blocked('capability-unsupported');
  if (undeclaredEnvironmentName(suite, description)) return blocked('environment-undeclared');

  const savedTestedBlock = unavailableSaved(suite.defaultTestedModel, description.models, cases[0]!.id, 'tested', blocked);
  if (savedTestedBlock) return savedTestedBlock;
  if (firstRubric) {
    const savedJudgeBlock = unavailableSaved(suite.defaultJudgeModel!, description.judgeModels, firstRubric.id, 'judge', blocked);
    if (savedJudgeBlock) return savedJudgeBlock;
  }

  const choice = command.runOnly;
  const selectedCase = cases[0]!;
  if (choice?.judgeModel && !needsJudge(selectedCase)) return blocked('invalid-run-only-choice', selectedCase.id, 'judge');
  if (choice?.testedModel && !description.models.includes(choice.testedModel)) return blocked('run-only-model-unavailable', selectedCase.id, 'tested');
  if (choice?.judgeModel && !description.judgeModels.includes(choice.judgeModel)) return blocked('run-only-model-unavailable', selectedCase.id, 'judge');

  return { status: 'ready', suiteId: suite.id, cases: cases.map((testCase) => ({
    caseId: testCase.id,
    testedModel: choice?.testedModel ?? suite.defaultTestedModel!,
    judgeModel: needsJudge(testCase) ? (choice?.judgeModel ?? suite.defaultJudgeModel!) : null,
  })) };
}

function validScope(scope: ResolveEvalRunSelectionCommand['scope']): boolean {
  return scope?.type === 'all' || (scope?.type === 'test_case' && typeof scope.testCaseId === 'string' && scope.testCaseId.length > 0);
}

function invalidRunOnlyRole(choice: RunOnlyModelChoice): ModelRole | undefined {
  if (!choice || typeof choice !== 'object' || Array.isArray(choice)) return 'tested';
  if (Object.keys(choice).some((key) => key !== 'testedModel' && key !== 'judgeModel')) return 'tested';
  if (!Object.hasOwn(choice, 'testedModel') && !Object.hasOwn(choice, 'judgeModel')) return 'tested';
  if (choice.testedModel !== undefined && (typeof choice.testedModel !== 'string' || !MODEL_ID.test(choice.testedModel))) return 'tested';
  if (choice.judgeModel !== undefined && (typeof choice.judgeModel !== 'string' || !MODEL_ID.test(choice.judgeModel))) return 'judge';
  return undefined;
}

function needsJudge(testCase: NormalizedEvalTestCase): boolean {
  return testCase.graders.some((grader) => grader.type === 'rubric');
}

function unavailableSaved(
  model: string, available: RuntimeDescription['models'], caseId: string, role: ModelRole,
  blocked: (reason: SelectionBlockReason, caseId?: string, role?: ModelRole) => ResolveEvalRunSelectionResult,
): ResolveEvalRunSelectionResult | undefined {
  return available.includes(model) ? undefined : blocked('saved-model-unavailable', caseId, role);
}
