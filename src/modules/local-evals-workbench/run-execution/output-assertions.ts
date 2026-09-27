import type { DeterministicAssertion } from '../discover-conventional-eval-suites/index.js';
import type { AssertionEvidence } from '../run-history/contracts.js';
import { validateJsonSchema } from './json-schema-adapter.js';
import { evaluateToolTurnAssertion } from './tool-turn-assertions.js';
import type { AttemptSnapshot } from '../execute-eval-run/ports.js';

const PREVIEW = 500;
const preview = (value: string): string => value.length > PREVIEW ? `${value.slice(0, PREVIEW)}… [preview shortened]` : value;

export function evaluateOutputAssertions(assertions: readonly DeterministicAssertion[], snapshot: AttemptSnapshot): readonly AssertionEvidence[] {
  const { output } = snapshot;
  const turnId = snapshot.turns.at(-1)?.id;
  return assertions.map(assertion => {
    if (assertion.type !== 'output-equals' && assertion.type !== 'output-contains' && assertion.type !== 'json-schema') return evaluateToolTurnAssertion(assertion, snapshot);
    let passed = false;
    let expected = '';
    let diagnostics: readonly string[] = [];
    if (assertion.type === 'output-equals') {
      if (assertion.expected.type === 'inline') {
        expected = assertion.expected.text;
        passed = output === expected;
      } else diagnostics = ['unresolved-reference'];
    } else if (assertion.type === 'output-contains') {
      expected = assertion.expected;
      passed = output.includes(expected);
    } else if (assertion.type === 'json-schema') {
      expected = JSON.stringify(assertion.schema);
      try {
        const result = validateJsonSchema(assertion.schema, JSON.parse(output));
        passed = result.status === 'valid';
        diagnostics = result.diagnostics;
      } catch { diagnostics = ['output-not-json']; }
    } else {
      diagnostics = ['unsupported-assertion'];
    }
    return {
      id: assertion.id, kind: 'assertion', outcome: passed ? 'passed' : 'failed', score: null,
      expected: preview(expected), actual: preview(output), diagnostics, turnIds: turnId ? [turnId] : [], toolIds: [],
    };
  });
}
