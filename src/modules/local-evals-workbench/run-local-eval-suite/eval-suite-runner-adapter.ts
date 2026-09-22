import type { NormalizedEvalSuite } from '../discover-conventional-eval-suites/index.js';
import type { EvalRunnerPort, EvalSuiteRegistryPort, RunnableEvalSuite } from './ports.js';

export class DiscoveredEvalSuiteRegistry implements EvalSuiteRegistryPort {
  constructor(private readonly definitions: readonly NormalizedEvalSuite[]) {}

  async findSuite(_projectRoot: string, suiteId: string): Promise<RunnableEvalSuite | null> {
    const definition = this.definitions.find((candidate) => candidate.version === 2 && candidate.id === suiteId);
    if (!definition) return null;

    return {
      version: 2,
      id: definition.id,
      name: definition.name,
      modelOptions: [],
      testCases: definition.testCases.map((testCase) => ({ id: testCase.id, name: testCase.name })),
    };
  }
}

export class UnavailableVersion2EvalSuiteRunner implements EvalRunnerPort {
  async runSuite(): Promise<Awaited<ReturnType<EvalRunnerPort['runSuite']>>> {
    return {
      status: 'blocked',
      message: 'Version-2 eval runner execution is not available yet.',
      diagnostics: [{
        code: 'version-2-runner-unavailable',
        severity: 'warning',
        message: 'Wait for the version-2 runner execution slice before running this suite.',
      }],
    };
  }
}
