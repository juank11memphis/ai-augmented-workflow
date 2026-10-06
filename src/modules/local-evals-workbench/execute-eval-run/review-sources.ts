import path from 'node:path';
import { declaredRunnerFile } from '../discover-conventional-eval-suites/suite-contract.js';
import type { NormalizedEvalTestCase } from '../discover-conventional-eval-suites/index.js';
import type { ExecuteEvalRunCommand } from './command.js';
import type { Attempt } from '../run-history/contracts.js';
import { LIMITS } from '../run-history/limits.js';
import { component } from '../run-history/artifact-paths.js';

function projectPath(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('/') || value.replace(/\\/g, '/').split('/').includes('..') || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const normalized = path.posix.normalize(value.replace(/\\/g, '/'));
  return normalized !== '.' && !normalized.startsWith('/') && normalized.length <= 400 ? normalized : null;
}

function evalInputPath(value: string): string | null {
  const relative = value.startsWith('evals/') ? value : `evals/${value}`;
  return projectPath(relative);
}

export function reviewSources(command: ExecuteEvalRunCommand, caseId: string): NonNullable<Attempt['review']> {
  const original: NormalizedEvalTestCase | undefined = command.suite.testCases.find(item => item.id === caseId);
  const inputs = [
    ...original?.turns.map(turn => turn.content.type === 'file' ? turn.content.path : undefined) ?? [],
    original?.fixture?.type === 'file' ? original.fixture.path : undefined,
    original?.reference?.type === 'file' ? original.reference.path : undefined,
    ...original?.assertions.map(check => check.type === 'output-equals' && check.expected.type === 'file' ? check.expected.path : undefined) ?? [],
    ...original?.graders.map(check => check.type === 'rubric' && check.rubric.type === 'file' ? check.rubric.path : undefined) ?? [],
  ];
  const inputPaths = [...new Set(inputs.filter((value): value is string => typeof value === 'string').map(evalInputPath)
    .filter((value): value is string => value !== null))];
  return {
    runPath: `evals/artifacts/${component(command.suite.id)}/${component(command.runId)}/run.json`,
    suitePath: projectPath(command.suitePath),
    targetPath: projectPath(command.suite.target.path),
    runnerPath: projectPath(declaredRunnerFile(command.suite.runner.command)?.path),
    inputPaths: inputPaths.slice(0, LIMITS.evidenceItems),
    omittedInputPathCount: inputPaths.length > LIMITS.evidenceItems ? inputPaths.length - LIMITS.evidenceItems : 0,
    context: 'current-repo-files',
  };
}
