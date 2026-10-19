# Version-2 suite and project runner authoring contract

Read this reference before generation. The suite schema is enforced by Sibu's public `validateEvalSuiteContract` API (Local Evals Workbench). Do not create another validator or use the illustrative SDD shorthand. The wire protocol below must match the Local Evals Workbench's execute-event validator. A generated project runner must be directly runnable through stdin/stdout independently of dashboard support.

## Suite schema

Use JSON under `evals/`, `version: 2`, and `kind: sibu-eval-suite`. IDs are stable, nonempty, unique within scope. Target kinds are `agent`, `integration`, `prompt`, or `workflow`. Preserve all reviewed coverage categories and scenarios. Coverage statuses are `covered`, `partly-covered`, `not-applicable`, and `known-gap`; all except `covered` require a reason. Gaps have an ID and reason, including risk and resolution.

Suites may separately save `defaultTestedModel` and `defaultJudgeModel` as nonempty model IDs at the top level. Both fields are optional for authoring and old version-2 suites without them remain valid. A required unset or unavailable suite default blocks preview/run until the user explicitly saves a compatible choice; never infer a provider default or the coding agent's model. Judge is required only when the selected scope includes rubric grading. `sibu evals run <suite-id>` reuses valid saved choices without asking for a run-wide model. A one-case temporary model choice belongs to `--case <case-id>` with `--model` and, when applicable, `--judge`; it is run-only, never written to the suite or applied to a full-suite run.

Each test case may independently save `testedModel` and `judgeModel` as nonempty model IDs. Absence means inherit that role's suite default; remove just that field to reset that role without altering the other. A required suite default still must exist even when every selected case overrides it. Before a full-suite run, resolve every case in source order and block if any saved choice is unavailable. For an unavailable case override, explicitly **Replace** it with a compatible model or **Inherit** by removing that case field; if the inherited suite default is unavailable, resolve it separately. Never silently fall back, skip a case, or retry paid model calls automatically. For example, nine cases with suite tested default X and only one `testedModel: Y` use X for eight and Y for one; rubric cases resolve Judge independently. Ordered batches may use different model pairs under one logical run, while results must show the actual tested and applicable Judge model for each case, not a later suite default. Old suites without case fields remain valid.

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

Describe emits one `description` event. Its `data` contains `runnerId`, `capabilities` (subset of `single-turn`, `multi-turn`, `tool-mocks`, `custom`, `rubric`), `models`, `judgeModels`, and `requiredEnvironment` (names only). It performs no target/model/judge calls or external actions. Rubric selections require a compatible separately selected Judge Model; no default to the tested model.

For execute, `testCases` contains the nonempty selected normalized version-2 case objects (not IDs); Sibu resolves file content to inline values before invoking the runner. A project runner that checks selected cases against suite definitions must compare them with safely resolved suite cases, not raw file references. `judgeModel` is null when no rubrics are selected. Each selected case runs once. Starting a run may make paid model calls; no call count or cost estimate is provided.

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
| `description` | Shape above |
| `run-started` | `model`, `judgeModel` |
| `case-attempt-started` | `{}` |
| `conversation-turn-completed` | `turnIndex` (zero-based input turn), optional unique `turnId`, `role` (`assistant`), `output` (bounded redacted string) |
| `tool-interaction-recorded` | Unique `toolId`, prior `turnId`, zero-based `position`, `name`, `arguments` (bounded JSON), `outcome` (`result`, `error`, or `unexpected-response`), `result` (bounded JSON mock outcome) |
| `custom-assertion-completed` | `checkId`, `passed` (boolean), `score` (0–1 or `null`), nonempty `evidence` (at most 500 UTF-8 bytes), `diagnostics` (safe strings) |
| `rubric-judgment-completed` | Custom result fields plus `judgeModel`, numeric `score` (0–1), `threshold`; `passed` equals `score >= threshold` |
| `rubric-judgment-error` | `checkId`, actual `judgeModel`, safe reason `code` (lowercase letters, digits and hyphens, starting with a letter); no score or model-failure claim |
| `case-attempt-completed` | `status`: `completed` or `error` |
| `run-diagnostic` | `code` (safe reason code), `message` (fixed safe summary) |
| `run-completed` | `status`: `completed`, `error`, or `interrupted` |

Execute order: `run-started`, then each selected case once in selection order: attempt started; completed turns in turn order, followed by their tool events in dispatch order; custom/rubric events in grader order; attempt completed. Finish with run completed. Buffer tool traces until their turn-completed event has established the `turnId`. On a mismatched or undeclared tool call, fail the attempt safely rather than emitting a rejected tool event. Diagnostics may occur within the active attempt or at run scope. A failed attempt emits a diagnostic, attempt error, and run error; never fabricate missing evidence or mark incomplete work completed. Completed means execution finished, not a Sibu deterministic-assertion pass. Do not emit undeclared event data fields such as `id` or `artifactReferences` for grader results.

### Version-2 execute source evidence

The request remains `protocolVersion: 1` for old-runner compatibility. A capable runner opts into source evidence by emitting **all** execute envelopes with `protocolVersion: 2`, starting with `run-started`; do not mix versions in one invocation. Version-1 runners remain valid but do not claim exact source capture. Version-2 runners add `source-record-chunk` events after the referenced `conversation-turn-completed` and, for a delivered tool, after its `tool-interaction-recorded`. They keep all version-1 event types and order rules. `case-attempt-completed.data` must additionally contain `sourceEvidenceComplete` (boolean). Set it true only after every completed turn has a model-call record, every recorded tool has a delivered-tool record, and no record is unfinished. False records a typed incomplete gap; an interrupted runner must not claim true. A missing source field in a version-1 run is `not-captured`, never reconstructed from a suite fixture.

Each chunk has exactly `recordId`, zero-based `index`, positive `count` (at most 16), complete-record `byteLength` (at most 256000), and `base64` containing 1–40000 exact bytes. Chunks for one record are contiguous, in index order, and share identity/count/length; records cannot reuse IDs. The completed concatenation is strict UTF-8 JSON. A malformed, duplicated, out-of-order, cross-attempt, or false-complete record is rejected. Existing per-line, event-count, total stdout, and attempt limits still apply; exceeding one is a capture failure, not a truncated raw value.

The decoded record is one of three exact shapes. `model-call`: `kind`, unique `id`, existing `turnId`, declared deterministic `checkId`, selected `modelId`, `phase` (`initial` or `post-tool`), nonnegative `elapsedMs`, ordered `inputMessages` (`role`, exact `content`), exact `rawText`, `rawToolCalls` (`id`, `name`, structured JSON `arguments`), `normalizedOutput`, and optional attested `approvedFacts` (`factId`, `provenance`). `tool-delivery`: `kind`, unique `id` matching an already recorded tool, existing `turnId`, declared deterministic `checkId`, existing `modelCallId`, `name`, exact JSON `request` and delivered `result`, `outcome`, and nonnegative `elapsedMs`. Optional `redactedFields` names runner-redacted fields (`inputMessages`, `rawText`, `rawToolCalls`, `normalizedOutput` for a call; `request`, `result` for a tool). These two records use a declared Sibu-owned deterministic assertion `checkId`. Keep provider text/calls distinct from normalized output and label a post-tool assistant continuation with `phase: post-tool`; a declared mock result is not proof it was delivered. Use only facts that the runner can attest appeared in the recorded input messages.

`judge-exchange` is the third shape: `kind`, unique `id`, existing `turnId`, declared rubric grader `checkId`, actual selected `judgeModel`, `eventSequence`, nonnegative integer `elapsedMs`, exact `evaluatedRubric`, exact `request` sent to the judge (instructions, evaluated answer and supplied reference context), optional exact `response` and `rationale`, and `result`. Emit its chunks only **after** the matching `rubric-judgment-completed` or `rubric-judgment-error` event, before attempt completion. `eventSequence` is that judgment event's envelope sequence, not the chunk's. A scored `result` is `{ "status": "completed", "score": 0.4, "threshold": 0.8, "passed": false }`: finite numeric score and threshold in 0–1, matching the judgment, with `passed` exactly `score >= threshold`. A scoreless error `result` is `{ "status": "grading-error", "code": "malformed-score" }`: its code must match `rubric-judgment-error`, and it must not acquire a score or failed model assertion. Preserve an actual malformed response when safely retained; do not synthesize one. Scored records require `response` and `rationale`; error records may omit either when unavailable. Optional `redactedFields` lists only runner-redacted `evaluatedRubric`, `request`, `response`, or `rationale` fields, with visible markers in retained fields. Do not infer the exchange later from the rubric fixture or normalized model output.

For an attempt with rubric judgments, include `judgeEvidenceComplete` (boolean) alongside `sourceEvidenceComplete`. Set it true only if every emitted rubric judgment or grading error has one fully chunked, linked judge record; false means an explicit incomplete judge-evidence gap. A missing judge record in an older version-1 run is `not-captured`, not a reconstructed request. Do not report a completed attempt with unfinished chunks or claim either completeness flag after capture failure, interruption, or an exceeded limit. Retain exact judge content only in authorized source evidence, never in stderr, ordinary run output, compact manifests or logs; log safe IDs, counts and reason codes only.

Minimal deterministic source record, using a synthetic selected case with assertion `exact`, turn `turn-1`, and tested model `fake`:

```source-record-json
{"kind":"model-call","id":"call-1","turnId":"turn-1","checkId":"exact","modelId":"fake","phase":"initial","elapsedMs":3,"inputMessages":[{"role":"user","content":"Hello."}],"rawText":"Hello.","rawToolCalls":[],"normalizedOutput":"Hello."}
```

The runner serializes those UTF-8 bytes, base64-encodes them into one `source-record-chunk` envelope (`index: 0`, `count: 1`, actual `byteLength`) between the turn and `case-attempt-completed`, then reports `sourceEvidenceComplete: true`. The deterministic contract test feeds this example through the production execute-event validator, including a rejected wrong link and incomplete chunk. Source records are intentionally retained selected evidence, unlike routine diagnostics: never send credentials, hidden chain-of-thought, uncertain-redaction content, or raw responses to logs. A runner-reported redaction marker belongs in the retained field and must remain visibly marked; this extension adds no new redaction policy. The prior no-full-response advice still applies to logs, stderr, manifests, and ordinary run output, not explicitly retained and safely authorized source evidence.

Synthetic judge source record for rubric grader `grounded`, turn `turn-1`, and matching `rubric-judgment-completed` envelope sequence 4 (after a model-call chunk at sequence 3):

```judge-record-json
{"kind":"judge-exchange","id":"judge-1","turnId":"turn-1","checkId":"grounded","judgeModel":"fake/judge","eventSequence":4,"elapsedMs":7,"evaluatedRubric":"Report only the known status.","request":"Grade answer pending against reference pending using the grounded rubric.","response":"{\"score\":0.4,\"rationale\":\"Insufficient detail\"}","rationale":"Insufficient detail","result":{"status":"completed","score":0.4,"threshold":0.8,"passed":false}}
```

Emit this record's `source-record-chunk` at sequence 5, then `case-attempt-completed` at sequence 6 with `sourceEvidenceComplete: true` and `judgeEvidenceComplete: true`. The request and response above are synthetic placeholders for **actual bytes captured at judge invocation**; never rebuild them from case definitions. For malformed scoring, emit `rubric-judgment-error`, a linked `judge-exchange` with `result.status: "grading-error"` and the same safe code, then an errored attempt/run. Keep the exact safely retained response if one exists and mark missing fields as gaps, not empty model failures.

For malformed requests emit only a safe `run-diagnostic` with code `invalid-request` and fixed message, null execution identities, and the original request ID when it passes the safe ID check (otherwise `invalid-request`); exit nonzero. A placeholder ID for a safe received ID prevents Sibu from correlating the diagnostic. Runtime errors retain active identities, emit terminal error events, and exit nonzero. Never emit raw exceptions, prompts, credentials, full model responses or hidden chain-of-thought. Retain only concise rubric evidence, bounded custom results and normalized turns/traces authorized for retention; redaction uncertainty must fail closed.

### Version-3 tested-model response observations

An updated runner opts into `protocolVersion: 3` for **every execute event**, beginning with `run-started`; the request stays version 1. Version-1 and version-2 runners remain valid, but their missing provider responses are `not-captured`, not reconstructible from normalized output. Capture exact response bytes **before parsing**, and emit the observation promptly before a malformed-output diagnostic or attempted case completion. This also applies to non-success provider responses. Use a stable `callId` and `provisionalTurnId` even if no turn ever completes. Response events belong to the active case/attempt, not an assertion.

For an observed response, emit `provider-response-started` with `callId`, `provisionalTurnId`, selected `modelId`, and optional `contentType` and `originalByteLength`; contiguous `provider-response-chunk` events with `callId`, zero-based `index`, and exact-byte `base64`; then `provider-response-completed` with `callId` and `completeness` (`complete`, `truncated`, or `incomplete`). Each chunk is at most 40000 decoded bytes. Declare original size when known; `truncated` identifies a retained prefix, never a complete raw body. Sibu retains at most 128000 bytes per response and 512000 bytes per run; selected `--field` reads expose at most 1024 bytes per call. If no response arrived, emit `provider-response-gap` with `callId`, `provisionalTurnId`, and `reason: "not-observed"`. If a response arrived but could not be emitted, use `not-emitted`; for capture failure, use `capture-failed`. An unfinished started response becomes an `incomplete` gap. Add a safe `run-diagnostic` code and concise reason when failure occurs; never put a body in stderr, diagnostics, ordinary JSON, or logs. Do not claim hidden reasoning unavailable to the runner.

This deterministic fixture shows an observation emitted before malformed-output reporting and a separate no-response gap. `events` are ordered `type`/`data` pairs under the ordinary version-3 execute envelope; the contract test sends them through Sibu's production execute-event validator.

```provider-response-json
{"observed":[{"type":"provider-response-started","data":{"callId":"call-1","provisionalTurnId":"turn-1","modelId":"fake","contentType":"application/json","originalByteLength":3}},{"type":"provider-response-chunk","data":{"callId":"call-1","index":0,"base64":"YmFk"}},{"type":"provider-response-completed","data":{"callId":"call-1","completeness":"complete"}},{"type":"run-diagnostic","data":{"code":"malformed-output"}}],"unavailable":[{"type":"provider-response-gap","data":{"callId":"call-2","provisionalTurnId":"turn-2","reason":"not-observed"}},{"type":"run-diagnostic","data":{"code":"provider-no-response"}}]}
```

The `fake`/`bad` values are synthetic. This fixture proves contract acceptance, not live-provider emission. Existing GeniusCR code-only output needs a **separate project-side runner update** to capture and emit bytes on failure paths. Sibu cannot reconstruct historical responses from those codes.

## Project-owned implementation

After commands/results, define injected ports for target/model invocation, separately selected judge invocation, mock-tool dispatch and safe event emission. Implement a transport-agnostic handler, project-specific SDK/framework adapters, then thin stdin/stdout entrypoint and separate composition wiring. Handlers do not construct clients or access process/filesystem globals. Do not import Sibu slice internals or add a Sibu runtime generator.

The target adapter must call the real target integration with the selected tested model, not canned expected outputs. Keep conversation state within each multi-turn attempt and reset it, mock cursors and tool traces between attempts. Install mocks before target initialization, not after production clients have already been constructed. Tests may inject fake model/judge ports; actual runner adapters must use verified imports and supported SDK mappings. If the framework or mocking seam cannot be established by focused inspection and conventional tests, stop for clarification; do not call placeholders runnable or modify production code to manufacture a seam.

Before every artifact read/write, require project-root-contained lexical paths and nearest-existing-real-path checks, including symlink parents of new files. Reuse the target project's established safe path policy where available. Reject absolute paths and traversal. A trusted project runner is not an OS sandbox. Synthetic/redacted fixtures must contain no credentials, live endpoints or raw production data. Safe logs use IDs/counts/reason codes only; authorized evidence is separate, bounded and redacted before emission/persistence.

## Conventional proof and handoff

Generate ordinary runner tests with injected fake model/judge ports and production-client sentinels. Prove describe makes zero calls; selected models/cases reach the target once; multi-turn state resets; tool success/error/unexpected outcomes, selection, arguments/order and unknown/mismatched calls stay isolated. Demonstrate the sentinel detects an intentionally bypassed mock seam. Check malformed requests, output purity, bounds, safe errors, root/symlink escapes, environment names versus values, fixture provenance and unchanged production bytes. These tests do not prove live-agent compliance or arbitrary framework support. Then run the Sibu preview contract check from the project root: `node .agents/skills/eval-authoring/scripts/check-preview-contract.mjs --suite <suite-id>`. The full-suite check uses saved defaults and Sibu's actual input resolution without executing a run or calling a model. If a required default is missing or unavailable, report the block and save an explicit compatible choice before claiming readiness. Only for `--case <case-id>` may `--model <target-model>` or `--judge <judge-model>` express temporary run-only choices; they do not change suite defaults. A blocked check is not runnable proof.

Preserve existing Git rules and append root `/evals/artifacts/` only when needed. Verify effective ignore (`git check-ignore --no-index evals/artifacts/probe.json`) and no tracked contents (`git ls-files -- evals/artifacts`). A later negating rule, missing Git or tracked artifacts needs user guidance; never delete/untrack automatically. Do not create results or tracked placeholders. Keep ignored artifacts out of ordinary agent context. End with created paths, prerequisites, conventional test results, retained coverage gaps and a later direct-protocol invocation guide; do not execute the suite while authoring.
