# Version-2 suite and project runner authoring contract

Read this reference before generation. The suite schema is enforced by Sibu's public `validateEvalSuiteContract` API (Local Evals Workbench). Do not create another validator or use the illustrative SDD shorthand. The wire protocol below is an explicit authoring contract for future adapter reuse, not a claim that dashboard version-2 execution is already implemented. A generated project runner must be directly runnable through stdin/stdout independently of dashboard support.

## Suite schema

Use JSON under `evals/`, `version: 2`, and `kind: sibu-eval-suite`. IDs are stable, nonempty, unique within scope. Target kinds are `agent`, `integration`, `prompt`, or `workflow`. Preserve all reviewed coverage categories and scenarios. Coverage statuses are `covered`, `partly-covered`, `not-applicable`, and `known-gap`; all except `covered` require a reason. Gaps have an ID and reason, including risk and resolution.

Text uses `{ "type": "inline", "text": "..." }` or `{ "type": "file", "path": "references/expected.txt" }`. Fixtures use `{ "type": "inline", "value": <JSON> }` or a file path with the same file tag. Each case has nonempty turns with role `system`, `user`, `assistant`, or `tool`, and at least one assertion or grader. Empty mock/assertion/grader arrays are permitted when not needed.

Path bases are field-specific:

- Tagged file content in turns, fixtures, references, `output-equals.expected`, and rubric graders is resolved relative to the project-root `evals/` directory. For `evals/references/expected.txt`, prefer `references/expected.txt`. The validator also accepts `evals/references/expected.txt` and removes its leading `evals/` before discovery; both forms identify the same file. Content must stay inside `evals/` after lexical and real-path checks; do not use `../src/...` or symlinks to reach production sources.
- `target.path` and the declared runner file in `runner.command` are project-root-relative: for example `src/support.ts` and `evals/runners/support.mjs`. Runner cwd is the project root; do not apply the content-path base to these fields.
- Proprietary production prompts remain at their project-owned source. The project runner's target adapter imports or reads that source through the real integration with project-root containment checks, not through a suite content reference. Never copy production prompts into eval fixtures or relax content containment to access them.

Sibu-owned deterministic `assertions` (each has `id` and `type`):

| Type | Fields |
| --- | --- |
| `output-equals` | `expected`: tagged text |
| `output-contains` | `expected`: string |
| `json-schema` | `schema`: JSON Schema |
| `tool-called`, `tool-not-called` | `tool`: name |
| `tool-arguments-equal` | `tool`, `expected`: JSON |
| `tool-arguments-schema` | `tool`, `schema`: JSON Schema |
| `tool-call-sequence` | `tools`: ordered names |
| `turn-count` | `expected`: positive integer |
| `turn-output` | `turnIndex`: zero-based integer, `operator`: `equals` or `contains`, `expected`: string |

Runner-owned `graders`: `{ "id": "...", "type": "custom", "name": "project-check" }` or `{ "id": "...", "type": "rubric", "rubric": <tagged text>, "threshold": 0.8 }`. Rubric scores and thresholds are between 0 and 1; the threshold is inspectable, not a hidden judge decision.

Tool mocks have `id`, `tool`, `input` (exact JSON arguments), and `outcome`: `{ "type": "result", "value": <JSON> }`, `{ "type": "error", "code": "...", "message": "..." }`, or `{ "type": "unexpected-response", "value": <JSON> }`. Match in declared order, consume each once per attempt, and reset between attempts. Never fall back to production clients for undeclared, extra, out-of-order, or mismatched calls. Trace every requested tool, normalized arguments, outcome and zero-based position; reject unsafe evidence before emission.

Compact schema-valid, file-backed example (adapt paths and behavior to the inspected target). Save the suite as `evals/support.json` with this project layout:

```text
src/support.ts
evals/support.json
evals/runners/support.mjs
evals/inputs/lookup.txt
evals/fixtures/order.json
evals/references/expected.txt
evals/rubrics/grounded.txt
```

The synthetic content files contain: `inputs/lookup.txt`: `Find synthetic order A.`; `fixtures/order.json`: `{"orderId":"A"}`; `references/expected.txt`: `pending`; `rubrics/grounded.txt`: `Report only the known status.`. The target and runner are project-owned implementations, not these content files. Discovery checks declared files without executing the target or runner.

```json
{
  "version": 2,
  "kind": "sibu-eval-suite",
  "id": "support",
  "name": "Support decisions",
  "description": "Synthetic support coverage.",
  "target": { "id": "support", "kind": "agent", "path": "src/support.ts" },
  "coverage": {
    "categories": [
      { "id": "happy-path", "status": "covered" },
      { "id": "tool-behavior", "status": "partly-covered", "reason": "Mocked lookup only; add other tools after scope review." }
    ],
    "gaps": [{ "id": "live-services", "reason": "External side effects excluded; service resilience needs separate integration tests." }]
  },
  "runner": { "command": ["node", "evals/runners/support.mjs"], "requiredEnvironment": ["MODEL_API_KEY"] },
  "testCases": [{
    "id": "lookup", "name": "Lookup synthetic order",
    "turns": [{ "role": "user", "content": { "type": "file", "path": "inputs/lookup.txt" } }],
    "fixture": { "type": "file", "path": "fixtures/order.json" },
    "reference": { "type": "file", "path": "references/expected.txt" },
    "toolMocks": [{ "id": "lookup-A", "tool": "lookup", "input": { "id": "A" }, "outcome": { "type": "result", "value": { "status": "pending" } } }],
    "assertions": [
      { "id": "lookup-first", "type": "tool-call-sequence", "tools": ["lookup"] },
      { "id": "known-status", "type": "output-equals", "expected": { "type": "file", "path": "references/expected.txt" } }
    ],
    "graders": [{ "id": "grounded", "type": "rubric", "rubric": { "type": "file", "path": "rubrics/grounded.txt" }, "threshold": 0.8 }]
  }]
}
```

## Independent runner protocol: version 1

One UTF-8 JSON request per process on stdin; NDJSON on stdout only. Diagnostics go to bounded stderr, never mixed with protocol output. Use project-root cwd, a validated command argument array with `shell: false`, base process environment plus declared environment names only, and explicit `SIBU_EVAL_MODE=1` for every operation. Environment values never enter requests, files, diagnostics or events. Reject unsupported versions, malformed requests, unknown models, empty selections, duplicate cases, unsupported repeat fields and missing eval mode before target initialization. Requests/events are untrusted; bound input, lines, total output, traces and stderr, and enforce startup/idle/overall timeouts in the caller. Stop/terminate on protocol violations and report interruption honestly.

### Commands and results first

Requests use exactly one `operation`, independently versioned `protocolVersion: 1`, and safe stable `requestId`. Model IDs are provider-qualified opaque strings, not SDK objects or credentials.

```json
{ "protocolVersion": 1, "requestId": "describe-1", "operation": "describe" }
```

Describe emits one `description` event. Its `data` contains `runnerId`, `capabilities` (subset of `single-turn`, `multi-turn`, `tool-mocks`, `custom`, `rubric`), `models`, `judgeModels`, `requiredEnvironment` (names only), and `costEstimation` (boolean). It performs no target/model/judge calls or external actions. Rubric selections require a compatible separately selected Judge Model; no default to the tested model.

```json
{ "protocolVersion": 1, "requestId": "estimate-1", "operation": "estimate", "model": "fake/target", "judgeModel": "fake/judge", "testCases": [{ "id": "greet", "name": "Greet", "turns": [{ "role": "user", "content": { "type": "inline", "text": "Hello." } }], "toolMocks": [], "assertions": [], "graders": [{ "id": "tone", "type": "rubric", "rubric": { "type": "inline", "text": "Respond politely." }, "threshold": 0.8 }] }] }
```

For estimate and execute, `testCases` contains the nonempty selected normalized version-2 case objects (not IDs); Sibu resolves file content to inline values before invoking the runner. A project runner that checks selected cases against reviewed suite definitions must compare them with safely resolved reviewed cases, not raw file references. `judgeModel` is null when no rubrics are selected. Each selected case runs once. Estimate emits one `estimate` event with `targetCalls`, `judgeCalls`, `totalCalls`, and `cost`: `{ "status": "available", "amount": 0.01, "currency": "USD" }` or `{ "status": "unavailable", "reason": "Provider pricing unavailable." }`. Call counts are nonnegative integers based on selected turns, tools, and grading; explain estimation assumptions in setup notes. Estimate never invokes model/judge/tools to discover prices or counts.

```json
{ "protocolVersion": 1, "requestId": "execute-1", "operation": "execute", "runId": "run-1", "model": "fake/target", "judgeModel": "fake/judge", "testCases": [{ "id": "greet", "name": "Greet", "turns": [{ "role": "user", "content": { "type": "inline", "text": "Hello." } }], "toolMocks": [], "assertions": [], "graders": [{ "id": "tone", "type": "rubric", "rubric": { "type": "inline", "text": "Respond politely." }, "threshold": 0.8 }] }] }
```

### Event envelope and ordered evidence

Every event has exactly this envelope; `sequence` starts at 0 and increases by 1 per invocation. Non-execute events use null `runId`, `caseId` and `attempt`. Execute run-wide events use the request run ID and null case/attempt; attempt events use the selected case ID and a one-based attempt number. Never emit another request's identity.

```json
{ "protocolVersion": 1, "requestId": "execute-1", "sequence": 0, "type": "run-started", "runId": "run-1", "caseId": null, "attempt": null, "data": { "model": "fake/target", "judgeModel": "fake/judge" } }
```

Event `type` and `data` contracts:

| Type | Data |
| --- | --- |
| `description`, `estimate` | Shapes above |
| `run-started` | `model`, `judgeModel` |
| `case-attempt-started` | `{}` |
| `tool-interaction-recorded` | `position`, `tool`, `arguments` (JSON), `outcome` (mock outcome or `{ "type": "rejected", "code": "tool-mismatch" }`) |
| `conversation-turn-completed` | `turnIndex` (zero-based input turn), `role` (`assistant`), `output` (bounded redacted string) |
| `custom-assertion-completed` | `id`, `passed` (boolean), `evidence` (bounded string), `diagnostics` (safe codes), `artifactReferences` (contained relative paths) |
| `rubric-judgment-completed` | Custom result fields plus `judgeModel`, `score`, `threshold`; `passed` equals `score >= threshold` |
| `case-attempt-completed` | `status`: `completed` or `error` |
| `run-diagnostic` | `code` (safe reason code), `message` (fixed safe summary) |
| `run-completed` | `status`: `completed`, `error`, or `interrupted` |

Execute order: `run-started`, then each selected case once in selection order: attempt started; tool events in dispatch order and completed turns in turn order; custom/rubric events in grader order; attempt completed. Finish with run completed. Tool events may precede the turn completion that requested them. Diagnostics may occur within the active attempt or at run scope. A failed attempt emits a diagnostic, attempt error, and run error; never fabricate missing evidence or mark incomplete work completed. Completed means execution finished, not a Sibu deterministic-assertion pass.

For malformed requests emit only a safe `run-diagnostic` with code `invalid-request` and fixed message, null execution identities, and the original request ID when it passes the safe ID check (otherwise `invalid-request`); exit nonzero. A placeholder ID for a safe received ID prevents Sibu from correlating the diagnostic. Runtime errors retain active identities, emit terminal error events, and exit nonzero. Never emit raw exceptions, prompts, credentials, full model responses or hidden chain-of-thought. Retain only concise rubric evidence, bounded custom results and normalized turns/traces authorized for retention; redaction uncertainty must fail closed.

## Project-owned implementation

After commands/results, define injected ports for target/model invocation, separately selected judge invocation, mock-tool dispatch and safe event emission. Implement a transport-agnostic handler, project-specific SDK/framework adapters, then thin stdin/stdout entrypoint and separate composition wiring. Handlers do not construct clients or access process/filesystem globals. Do not import Sibu slice internals or add a Sibu runtime generator.

The target adapter must call the real target integration with the selected tested model, not canned expected outputs. Keep conversation state within each multi-turn attempt and reset it, mock cursors and tool traces between attempts. Install mocks before target initialization, not after production clients have already been constructed. Tests may inject fake model/judge ports; actual runner adapters must use verified imports and supported SDK mappings. If the framework or mocking seam cannot be established by focused inspection and conventional tests, stop for clarification; do not call placeholders runnable or modify production code to manufacture a seam.

Before every artifact read/write, require project-root-contained lexical paths and nearest-existing-real-path checks, including symlink parents of new files. Reuse the target project's established safe path policy where available. Reject absolute paths and traversal. A trusted project runner is not an OS sandbox. Synthetic/redacted fixtures must contain no credentials, live endpoints or raw production data. Safe logs use IDs/counts/reason codes only; authorized evidence is separate, bounded and redacted before emission/persistence.

## Conventional proof and handoff

Generate ordinary runner tests with injected fake model/judge ports and production-client sentinels. Prove describe/estimate make zero calls; selected models/cases reach the target once; multi-turn state resets; tool success/error/unexpected outcomes, selection, arguments/order and unknown/mismatched calls stay isolated. Demonstrate the sentinel detects an intentionally bypassed mock seam. Check malformed requests, output purity, bounds, safe errors, root/symlink escapes, environment names versus values, fixture provenance and unchanged production bytes. These tests do not prove live-agent compliance or arbitrary framework support. Then run the Sibu preview contract check from the project root: `node .agents/skills/eval-authoring/scripts/check-preview-contract.mjs --suite <suite-id> --model <target-model> --judge <judge-model>` (omit `--judge` when no rubric is selected). The check uses Sibu's actual input resolution and estimate request without executing a run or calling a model. A blocked check is not runnable proof.

Preserve existing Git rules and append root `/evals/artifacts/` only when needed. Verify effective ignore (`git check-ignore --no-index evals/artifacts/probe.json`) and no tracked contents (`git ls-files -- evals/artifacts`). A later negating rule, missing Git or tracked artifacts needs user guidance; never delete/untrack automatically. Do not create results or tracked placeholders. Keep ignored artifacts out of ordinary agent context. End with created paths, prerequisites, conventional test results, retained coverage gaps and a later direct-protocol invocation guide; do not execute the suite while authoring.
