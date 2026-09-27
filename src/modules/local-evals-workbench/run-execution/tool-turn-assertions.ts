import { isDeepStrictEqual } from 'node:util';
import type { DeterministicAssertion, JsonValue } from '../discover-conventional-eval-suites/index.js';
import type { AssertionEvidence } from '../run-history/contracts.js';
import type { AttemptSnapshot } from '../execute-eval-run/ports.js';
import { validateJsonSchema } from './json-schema-adapter.js';

const preview = (value: string): string => value.length > 500 ? `${value.slice(0, 500)}… [preview shortened]` : value;
type ToolTurnAssertion = Exclude<DeterministicAssertion, { type: 'output-equals' | 'output-contains' | 'json-schema' }>;

function parseJson(value: string): JsonValue | undefined {
  try { return JSON.parse(value) as JsonValue; } catch { return undefined; }
}

export function evaluateToolTurnAssertion(assertion: ToolTurnAssertion, snapshot: AttemptSnapshot): AssertionEvidence {
  const { tools, turns } = snapshot;
  let passed = false;
  let expected = '';
  let actual = '';
  let diagnostics: readonly string[] = [];
  let turnIds: readonly string[] = [];
  let toolIds: readonly string[] = [];
  if (assertion.type === 'turn-count') {
    expected = String(assertion.expected);
    actual = String(turns.length);
    turnIds = turns.map(turn => turn.id);
    passed = turns.length === assertion.expected;
  } else if (assertion.type === 'turn-output') {
    const turn = turns[assertion.turnIndex];
    expected = assertion.expected;
    actual = turn?.content ?? '[missing turn]';
    turnIds = turn ? [turn.id] : [];
    passed = !!turn && (assertion.operator === 'equals' ? turn.content === expected : turn.content.includes(expected));
    if (!turn) diagnostics = ['missing-turn'];
  } else if (assertion.type === 'tool-call-sequence') {
    expected = JSON.stringify(assertion.tools);
    actual = JSON.stringify(tools.map(tool => tool.name));
    toolIds = tools.map(tool => tool.id);
    passed = isDeepStrictEqual(tools.map(tool => tool.name), assertion.tools)
      && tools.every((tool, index) => tool.position === undefined || tool.position === index);
    if (!passed) diagnostics = ['tool-order-mismatch'];
  } else {
    const matching = tools.filter(tool => tool.name === assertion.tool);
    toolIds = matching.map(tool => tool.id);
    expected = assertion.type === 'tool-not-called' ? 'absent' : assertion.type === 'tool-called' ? 'called'
      : JSON.stringify(assertion.type === 'tool-arguments-equal' ? assertion.expected : assertion.schema);
    actual = assertion.type === 'tool-called' || assertion.type === 'tool-not-called'
      ? `${matching.length} call(s)` : JSON.stringify(matching.map(tool => parseJson(tool.arguments) ?? '[malformed-json]'));
    if (assertion.type === 'tool-called') passed = matching.length > 0;
    else if (assertion.type === 'tool-not-called') passed = matching.length === 0;
    else if (assertion.type === 'tool-arguments-equal') passed = matching.length > 0 && matching.every(tool => {
      const value = parseJson(tool.arguments);
      return value !== undefined && isDeepStrictEqual(value, assertion.expected);
    });
    else {
      const results = matching.map(tool => {
        const value = parseJson(tool.arguments);
        return value === undefined ? { status: 'failed', diagnostics: ['tool-arguments-not-json'] } : validateJsonSchema(assertion.schema, value);
      });
      passed = results.length > 0 && results.every(result => result.status === 'valid');
      diagnostics = results.flatMap(result => result.diagnostics).slice(0, 8);
    }
  }
  return { id: assertion.id, kind: 'assertion', outcome: passed ? 'passed' : 'failed', score: null,
    expected: preview(expected), actual: preview(actual), diagnostics, turnIds, toolIds };
}
