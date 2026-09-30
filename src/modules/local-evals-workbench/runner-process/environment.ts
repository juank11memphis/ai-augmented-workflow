import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import { isDeclaredEnvironmentName, type RuntimeOutcome } from '../runtime-description.js';

/** Only executable lookup and essential OS runtime variables are inherited. */
const BASE_NAMES = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'SystemRoot'] as const;
const FORBIDDEN_NAMES = new Set(['SIBU_EVAL_MODE', 'NODE_OPTIONS', 'NODE_PATH', 'LD_PRELOAD', 'DYLD_INSERT_LIBRARIES']);
export function runnerEnvironment(
  suite: NormalizedEvalSuite,
  source: NodeJS.ProcessEnv = process.env
): RuntimeOutcome<{ readonly values: NodeJS.ProcessEnv; readonly secrets: readonly string[] }> {
  const values: NodeJS.ProcessEnv = { SIBU_EVAL_MODE: '1' };
  for (const name of BASE_NAMES) if (source[name]) values[name] = source[name];
  const secrets: string[] = [];
  for (const name of suite.runner.requiredEnvironment) {
    if (!isDeclaredEnvironmentName(name, suite.runner.requiredEnvironment) || FORBIDDEN_NAMES.has(name)) {
      return { status: 'blocked', reason: 'input-unsafe' };
    }
    const value = source[name];
    if (!value) return { status: 'blocked', reason: 'environment-missing', missingEnvironmentName: name };
    values[name] = value;
    secrets.push(value);
  }
  return { status: 'ready', value: { values, secrets } };
}
