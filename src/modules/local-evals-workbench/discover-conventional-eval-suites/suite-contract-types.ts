import type { EvalSuiteDiscoveryDiagnostic } from './result.js';

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
export type TargetKind = 'agent' | 'integration' | 'prompt' | 'workflow';
export type CoverageStatus = 'covered' | 'partly-covered' | 'not-applicable' | 'known-gap';
export type TurnRole = 'system' | 'user' | 'assistant' | 'tool';

export type TextContent =
  | { readonly type: 'inline'; readonly text: string }
  | { readonly type: 'file'; readonly path: string };

export type FixtureContent =
  | { readonly type: 'inline'; readonly value: JsonValue }
  | { readonly type: 'file'; readonly path: string };

export type NormalizedEvalSuite = {
  readonly version: 2;
  readonly kind: 'sibu-eval-suite';
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly target: { readonly id: string; readonly kind: TargetKind; readonly path: string };
  readonly coverage: {
    readonly categories: readonly { readonly id: string; readonly status: CoverageStatus; readonly reason?: string }[];
    readonly gaps: readonly { readonly id: string; readonly reason: string }[];
  };
  readonly runner: { readonly command: readonly string[]; readonly requiredEnvironment: readonly string[] };
  readonly testCases: readonly NormalizedEvalTestCase[];
};

export type NormalizedEvalTestCase = {
  readonly id: string;
  readonly name: string;
  readonly turns: readonly { readonly role: TurnRole; readonly content: TextContent }[];
  readonly fixture?: FixtureContent;
  readonly reference?: TextContent;
  readonly toolMocks: readonly ToolMock[];
  readonly assertions: readonly DeterministicAssertion[];
  readonly graders: readonly EvalGrader[];
};

export type ToolMock = {
  readonly id: string;
  readonly tool: string;
  readonly input: JsonValue;
  readonly outcome:
    | { readonly type: 'result'; readonly value: JsonValue }
    | { readonly type: 'error'; readonly code: string; readonly message: string }
    | { readonly type: 'unexpected-response'; readonly value: JsonValue };
};

export type DeterministicAssertion =
  | { readonly id: string; readonly type: 'output-equals'; readonly expected: TextContent }
  | { readonly id: string; readonly type: 'output-contains'; readonly expected: string }
  | { readonly id: string; readonly type: 'json-schema'; readonly schema: JsonValue }
  | { readonly id: string; readonly type: 'tool-called'; readonly tool: string }
  | { readonly id: string; readonly type: 'tool-not-called'; readonly tool: string }
  | { readonly id: string; readonly type: 'tool-arguments-equal'; readonly tool: string; readonly expected: JsonValue }
  | { readonly id: string; readonly type: 'tool-arguments-schema'; readonly tool: string; readonly schema: JsonValue }
  | { readonly id: string; readonly type: 'tool-call-sequence'; readonly tools: readonly string[] }
  | { readonly id: string; readonly type: 'turn-count'; readonly expected: number }
  | { readonly id: string; readonly type: 'turn-output'; readonly turnIndex: number; readonly operator: 'equals' | 'contains'; readonly expected: string };

export type EvalGrader =
  | { readonly id: string; readonly type: 'custom'; readonly name: string }
  | { readonly id: string; readonly type: 'rubric'; readonly rubric: TextContent; readonly threshold: number };

export type SuiteContractResult =
  | { readonly status: 'valid'; readonly suite: NormalizedEvalSuite }
  | { readonly status: 'invalid'; readonly diagnostics: readonly EvalSuiteDiscoveryDiagnostic[] };
