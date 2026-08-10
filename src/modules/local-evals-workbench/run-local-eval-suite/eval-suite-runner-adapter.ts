import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { EvalRunnerPort, EvalSuiteRegistryPort, RawEvalAssertionOutcome, RawEvalCellOutcome, RunnableEvalSuite, RunnableEvalTestCase } from './ports.js';

const EVALS_FOLDER = 'evals';

export class JsonEvalSuiteRegistry implements EvalSuiteRegistryPort {
  async findSuite(projectRoot: string, suiteId: string): Promise<RunnableEvalSuite | null> {
    const definitions = await readSuiteDefinitions(projectRoot);
    const definition = definitions.find((candidate) => candidate.id === suiteId);
    if (!definition) return null;

    return {
      id: definition.id,
      name: definition.name,
      modelOptions: definition.modelOptions,
      testCases: definition.testCases.map((testCase) => ({ id: testCase.id, name: testCase.name ?? testCase.id })),
    };
  }
}

export class JsonEvalSuiteRunnerAdapter implements EvalRunnerPort {
  async runSuite(request: Parameters<EvalRunnerPort['runSuite']>[0]) {
    const definitions = await readSuiteDefinitions(request.projectRoot);
    const definition = definitions.find((candidate) => candidate.id === request.suite.id);
    if (!definition) {
      return { status: 'blocked' as const, message: 'Eval suite definition was not found.', diagnostics: [{ code: 'suite-missing', severity: 'error' as const, message: 'Refresh suite discovery and try again.' }] };
    }

    const rawCases = new Map(definition.testCases.map((testCase) => [testCase.id, testCase]));
    const cells = request.testCases.map((testCase) => runTestCase(testCase, rawCases.get(testCase.id), request.evalRunModel.id));
    return { status: 'completed' as const, cells };
  }
}

type RawSuiteDefinition = {
  readonly id: string;
  readonly name: string;
  readonly modelOptions: readonly { readonly id: string; readonly label: string }[];
  readonly testCases: readonly RawTestCaseDefinition[];
};

type RawTestCaseDefinition = {
  readonly id: string;
  readonly name?: string;
  readonly output?: string;
  readonly assertions?: readonly RawAssertionDefinition[];
};

type RawAssertionDefinition = {
  readonly id?: string;
  readonly label?: string;
  readonly type?: string;
  readonly value?: string;
  readonly expected?: string;
};

async function readSuiteDefinitions(projectRoot: string): Promise<readonly RawSuiteDefinition[]> {
  const evalsPath = path.join(await fs.realpath(projectRoot), EVALS_FOLDER);
  const entries = await fs.readdir(evalsPath, { withFileTypes: true });
  const suites: RawSuiteDefinition[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name) !== '.json') continue;
    const payload = JSON.parse(await fs.readFile(path.join(evalsPath, entry.name), 'utf8')) as unknown;
    const suite = toRunnableSuiteDefinition(payload);
    if (suite) suites.push(suite);
  }

  return suites;
}

function toRunnableSuiteDefinition(payload: unknown): RawSuiteDefinition | null {
  if (!isRecord(payload) || payload.version !== 1 || payload.kind !== 'sibu-eval-suite') return null;
  const id = nonBlank(payload.id);
  const name = nonBlank(payload.name);
  if (!id || !name || !Array.isArray(payload.modelOptions) || !Array.isArray(payload.testCases)) return null;

  const modelOptions = payload.modelOptions.filter(isModelOption).map((option) => ({ id: option.id.trim(), label: option.label.trim() }));
  const testCases = payload.testCases.filter(isRawTestCase).map((testCase) => ({ id: testCase.id.trim(), name: nonBlank(testCase.name), output: nonBlank(testCase.output), assertions: Array.isArray(testCase.assertions) ? testCase.assertions.filter(isRawAssertion) : [] }));
  return { id, name, modelOptions, testCases };
}

function runTestCase(testCase: RunnableEvalTestCase, rawTestCase: RawTestCaseDefinition | undefined, modelId: string): RawEvalCellOutcome {
  if (!rawTestCase) return { testCaseId: testCase.id, status: 'error', diagnostics: [{ code: 'missing-test-case', severity: 'error', message: 'Runner could not load this test case.' }] };

  const output = rawTestCase.output ?? '';
  const assertions = (rawTestCase.assertions ?? []).map((assertion, index) => runAssertion(assertion, output, index));
  const status = assertions.some((assertion) => assertion.status === 'failed') ? 'failed' : 'passed';
  return { testCaseId: testCase.id, status, output, assertions, metrics: [{ name: 'assertions', value: assertions.length, unit: 'count' }], artifacts: [{ id: `${testCase.id}-${modelId}-output`, label: 'Output preview', kind: 'output-preview', preview: output }] };
}

function runAssertion(assertion: RawAssertionDefinition, output: string, index: number): RawEvalAssertionOutcome {
  const expected = assertion.value ?? assertion.expected ?? '';
  const passed = expected === '' || output.includes(expected);
  return { id: assertion.id ?? `assertion-${index + 1}`, label: assertion.label ?? assertion.type ?? `Assertion ${index + 1}`, status: passed ? 'passed' : 'failed', expected, actual: output, message: passed ? 'Assertion passed.' : 'Expected content was not present in output.' };
}

function isModelOption(value: unknown): value is { readonly id: string; readonly label: string } {
  return isRecord(value) && nonBlank(value.id) !== undefined && nonBlank(value.label) !== undefined;
}

function isRawTestCase(value: unknown): value is RawTestCaseDefinition {
  return isRecord(value) && nonBlank(value.id) !== undefined;
}

function isRawAssertion(value: unknown): value is RawAssertionDefinition {
  return isRecord(value);
}

function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
