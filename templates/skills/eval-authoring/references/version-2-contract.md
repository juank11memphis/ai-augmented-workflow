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

### Expected operational errors

Ordinary cases omit `expectedOutcome` and require one assistant reply for every declared input turn. To test an operation that should throw instead of replying, declare `"expectedOutcome": { "type": "operational-error" }` on that case and include at least one `custom` grader; reply rubrics are not supported for this outcome. For example, `"graders": [{ "id": "reject-invalid-input", "type": "custom", "name": "Checks the actual error code and message" }]`. The input `turns` array remains nonempty, but a completed operational-error attempt has **zero** assistant turns.

The runner emits `operational-error-observed` with `data: { "code": "invalid-input", "message": "Safe error summary" }` after `case-attempt-started`, then emits each declared `custom-assertion-completed` with its normal result fields **and** `actualError` equal to the observed `{ code, message }`. The custom assertion must inspect the actual caught error and decide `passed`; it must not infer success merely because an error occurred. The required sequence is attempt start → operational error → custom assertion(s) → completed attempt → completed run. A missing error, missing custom result, assistant reply in an error case, or unexpected error in an ordinary case cannot pass. An assertion reporting `passed: false` produces a completed **failed** case. A runner failure still uses the existing attempt/run `error` statuses and remains incomplete.

Error codes use lowercase letters, digits and hyphens, starting with a letter. The message is a nonempty safe summary of at most 500 UTF-8 bytes; do not expose secrets or raw exception payloads. Error cases using source-evidence protocol v2/v3 report `sourceEvidenceComplete: false` because no assistant turn or model-call source record exists. Do not synthesize a turn, tool event, or source record to satisfy evidence completeness.

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
| `operational-error-observed` | `code` (safe typed error code), `message` (nonempty bounded safe summary); only for a declared operational-error case before custom assertions |
| `tool-interaction-recorded` | Unique `toolId`, prior `turnId`, zero-based `position`, `name`, `arguments` (bounded JSON), `outcome` (`result`, `error`, or `unexpected-response`), `result` (bounded JSON mock outcome) |
| `custom-assertion-completed` | `checkId`, `passed` (boolean), `score` (0–1 or `null`), nonempty `evidence` (at most 500 UTF-8 bytes), `diagnostics` (safe strings); error cases also require `actualError` matching the observed error |
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

For malformed requests emit only a safe `run-diagnostic` with code `invalid-request` and fixed message, null execution identities, and the original request ID when it passes the safe ID check (otherwise `invalid-request`); exit nonzero. A placeholder ID for a safe received ID prevents Sibu from correlating the diagnostic. Runtime errors retain active identities, emit terminal error events, and exit nonzero. Never emit raw exceptions, prompts, credentials, full model responses or hidden chain-of-thought in diagnostics, logs, or routine output. Preserve exact received model and Judge response bytes in Git-ignored response artifacts regardless of content; keep other evidence bounded and redacted.

### Version-3 tested-model response observations

An updated runner opts into `protocolVersion: 3` for **every execute event**, beginning with `run-started`; the request stays version 1. Version-1 and version-2 runners remain valid, but their missing provider responses are `not-captured`, not reconstructible from normalized output. Capture exact response bytes **before parsing**, and emit the observation promptly before a malformed-output diagnostic or attempted case completion. This also applies to non-success provider responses. Use a stable `callId` and `provisionalTurnId` even if no turn ever completes. Response events belong to the active case/attempt, not an assertion.

For an observed response, emit `provider-response-started` with `callId`, `provisionalTurnId`, selected `modelId`, and optional `contentType` and `originalByteLength`; contiguous `provider-response-chunk` events with `callId`, zero-based `index`, and exact-byte `base64`; then `provider-response-completed` with `callId` and `completeness` (`complete`, `truncated`, or `incomplete`). Each chunk is at most 40000 decoded bytes; emit as many chunks as needed, without a response or run-wide retention cutoff. Declare original size when known; `truncated` means the provider or runner supplied only a prefix, never that Sibu silently clipped received bytes. Selected `--field` reads remain bounded; the artifact retains the entire received body. If no response arrived, emit `provider-response-gap` with `callId`, `provisionalTurnId`, and `reason: "not-observed"`. If a response arrived but could not be emitted, use `not-emitted`; for capture failure, use `capture-failed`. On interruption, preserve every accepted chunk as an incomplete response rather than discarding it. Never put a body in stderr, diagnostics, ordinary JSON, or logs. Do not claim hidden reasoning unavailable to the runner.

#### Evidence-readiness gate for project-owned runners

Before calling a runner ready, map each tested-model and Judge invocation from `model-call-started` through its end and response observation or gap. Preserve the distinction between no response, failure while reading/copying a response, emission failure, and Sibu-side rejection or persistence failure. A runner cannot claim to know a downstream boundary it did not observe. A malformed-output diagnosis needs the exact response observation; if capture genuinely fails, emit a linked failure and bounded structural evidence, but report the missing raw bytes as a coverage gap; an unqualified `capture-failed` is insufficient. Do not treat potential sensitive content as a reason to omit received bytes.

Keep the protocol's fixed gap reasons; do not invent new `provider-response-gap.reason` values. For each `capture-failed` or `not-emitted` gap, emit a `run-diagnostic` with a fixed-vocabulary code linked to the runner-generated, bounded call ID. Distinguish at least missing body, clone/read error, invalid encoding, empty body, event-emission failure, and artifact-write failure where applicable. Do not use unsafe-content rejection, response-size, or run-size limits to discard received bytes. Do not collapse failures into one generic code or copy exception messages into diagnostics. Codes must match Sibu's lowercase-hyphen format and 80-character limit. Emit essential failure diagnostics before optional progress diagnostics; Sibu retains at most 20 diagnostics per attempt. If that budget cannot represent essential evidence, mark and report the evidence gap rather than claiming full diagnosability.

If capture or persistence genuinely fails, derive only bounded structural facts in memory from observed data: for example JSON parse success/failure, fixed allowlisted envelope field types, and bucketed collection counts. Emit fixed codes, not arbitrary keys, values, excerpts, hashes, prompts, URLs, credentials, personal data, hidden reasoning, or raw exceptions. Do not use secret/PII regexes to filter raw response artifacts. Structural diagnostics are not a substitute for missing raw bytes; state that limit in the result.

Prove this gate with deterministic fake responses for both roles: complete and provider-truncated bytes; malformed JSON or expected envelope; missing response/body; clone/read failure; invalid encoding; synthetic secret and personal-data sentinels; empty body; responses beyond the former per-response and per-run ceilings; interruption after received chunks; and event-emission failure. Assert call linkage, event ordering before malformed-output or grading errors, specific reason codes, byte-exact sentinel retention in ignored response artifacts, no sentinel bytes in diagnostics or logs, and that the target adapter can still read its response. Pass emitted events through Sibu's real execute-event validator when available. No live model call belongs in these tests. A passing preview contract check proves suite setup, **not** this evidence gate.

This deterministic fixture shows an observation emitted before malformed-output reporting and a separate no-response gap. `events` are ordered `type`/`data` pairs under the ordinary version-3 execute envelope; the contract test sends them through Sibu's production execute-event validator.

```provider-response-json
{"observed":[{"type":"provider-response-started","data":{"callId":"call-1","provisionalTurnId":"turn-1","modelId":"fake","contentType":"application/json","originalByteLength":3}},{"type":"provider-response-chunk","data":{"callId":"call-1","index":0,"base64":"YmFk"}},{"type":"provider-response-completed","data":{"callId":"call-1","completeness":"complete"}},{"type":"run-diagnostic","data":{"code":"malformed-output"}}],"unavailable":[{"type":"provider-response-gap","data":{"callId":"call-2","provisionalTurnId":"turn-2","reason":"not-observed"}},{"type":"run-diagnostic","data":{"code":"provider-no-response"}}],"captureFailure":[{"type":"provider-response-gap","data":{"callId":"call-3","provisionalTurnId":"turn-2","reason":"capture-failed"}},{"type":"run-diagnostic","data":{"code":"capture-call-3-read-failed"}},{"type":"run-diagnostic","data":{"code":"shape-call-3-json-object-choices-array"}}]}
```

The `fake`/`bad` values are synthetic. This fixture proves contract acceptance, not live-provider emission. Existing GeniusCR code-only output needs a **separate project-side runner update** to capture and emit bytes on failure paths. Sibu cannot reconstruct historical responses from those codes.

### Version-3 judge responses and failure gaps

For **both** the tested-model and judge roles, observe response bytes before parsing or grading, including non-success responses. Emit an observation before a malformed-output diagnostic or `rubric-judgment-error`; a grading error is not a completed judgment or a score. A judge response carries `role: "judge"`, the selected `modelId`, and the rubric `checkId` in addition to the call and provisional-turn IDs. Do not attach a judge response to an assertion or invent a completed turn. This runnable synthetic fixture uses the same version-3 execute envelope and active case/attempt as the tested-model fixture:

```judge-response-json
{"observed":[{"type":"provider-response-started","data":{"role":"judge","checkId":"quality","modelId":"fake/judge","callId":"judge-1","provisionalTurnId":"pending-turn","contentType":"application/json","originalByteLength":3}},{"type":"provider-response-chunk","data":{"callId":"judge-1","index":0,"base64":"YmFk"}},{"type":"provider-response-completed","data":{"callId":"judge-1","completeness":"complete"}},{"type":"rubric-judgment-error","data":{"checkId":"quality","judgeModel":"fake/judge","code":"malformed-score"}}],"unavailable":[{"type":"provider-response-gap","data":{"role":"judge","checkId":"quality","modelId":"fake/judge","callId":"judge-2","provisionalTurnId":"pending-turn","reason":"not-observed"}},{"type":"rubric-judgment-error","data":{"checkId":"quality","judgeModel":"fake/judge","code":"no-response"}}]}
```

When no response arrives, emit `not-observed`; when one arrives but the runner cannot emit it, use `not-emitted`; when capture fails, use `capture-failed`. An emitted observation rejected by Sibu's protocol validator, or accepted but not persisted, is a **Sibu-side** rejected/not-persisted gap where known—not a runner claim that no provider response arrived. If the runner cannot distinguish these states, report only the observed boundary. Older v1/v2 runners cannot supply v3 observations; missing bytes from them are `not-captured`. Keep bodies out of stderr, diagnostics, routine JSON and logs; selected bounded field reads and the ignored artifact expose the retained bytes. This example proves protocol shape, not that a real project runner emits it.

### Version-4 model-call lifecycle evidence

For each tested-model or judge invocation, use `protocolVersion: 4` on every execute event and emit `model-call-started` **before** invoking the provider. Its data is `callId`, `provisionalTurnId`, `role` (`tested-model` or `judge`), selected `modelId`, `phase` (`initial` or `post-tool` for tested models; `judge` for rubric judges), and judge `checkId` when applicable. Use the same IDs for subsequent version-3 response events or a response gap. Emit a response observation or gap **before** `model-call-ended`, whose data is `callId`, `status` (`completed`, `failed`, or `cancelled`), and—unless completed—`terminationSource` (`application-deadline`, `provider-timeout`, `runner-failure`, or `unknown`). Never claim `cancelled` merely because the runner exited; use it only when cancellation was actually observed. If no end event arrives, Sibu retains a **pending** call with the termination source it observed from the runner boundary, rather than inventing a provider outcome. A completed case must close every declared call and account for its response or gap.

Sibu stores bounded timestamps for when it accepted the start/end events, not a claimed provider-side latency. For a pending call it stores the last observed time separately; this is not a call completion time. Runner-generated deadlines and provider timeouts require the runner's own end event to distinguish them. Sibu can distinguish its own application deadline and runner failures, but cannot reconstruct a call that was never announced or a response that was never observed. An unfinished response retains only declared safe metadata such as content type and original byte length, never inferred bytes. Keep prompts, response bodies, credentials, raw exceptions, and uncertain-redaction metadata out of lifecycle events and routine diagnostics.

## Project-owned implementation

After commands/results, define injected ports for target/model invocation, separately selected judge invocation, mock-tool dispatch and safe event emission. Implement a transport-agnostic handler, project-specific SDK/framework adapters, then thin stdin/stdout entrypoint and separate composition wiring. Handlers do not construct clients or access process/filesystem globals. Do not import Sibu slice internals or add a Sibu runtime generator.

The target adapter must call the real target integration with the selected tested model, not canned expected outputs. Keep conversation state within each multi-turn attempt and reset it, mock cursors and tool traces between attempts. Install mocks before target initialization, not after production clients have already been constructed. Tests may inject fake model/judge ports; actual runner adapters must use verified imports and supported SDK mappings. If the framework or mocking seam cannot be established by focused inspection and conventional tests, stop for clarification; do not call placeholders runnable or modify production code to manufacture a seam.

Before every artifact read/write, require project-root-contained lexical paths and nearest-existing-real-path checks, including symlink parents of new files. Reuse the target project's established safe path policy where available. Reject absolute paths and traversal. A trusted project runner is not an OS sandbox. Synthetic/redacted fixtures must contain no credentials, live endpoints or raw production data. Safe logs use IDs/counts/reason codes only; authorized evidence is separate, bounded and redacted before emission/persistence.

## Conventional proof and handoff

Generate ordinary runner tests with injected fake model/judge ports and production-client sentinels. Prove describe makes zero calls; selected models/cases reach the target once; multi-turn state resets; tool success/error/unexpected outcomes, selection, arguments/order and unknown/mismatched calls stay isolated. Demonstrate the sentinel detects an intentionally bypassed mock seam. Check malformed requests, output purity, bounds, safe errors, root/symlink escapes, environment names versus values, fixture provenance and unchanged production bytes. These tests do not prove live-agent compliance or arbitrary framework support. Then run the Sibu preview contract check from the project root: `node .agents/skills/eval-authoring/scripts/check-preview-contract.mjs --suite <suite-id>`. The full-suite check uses saved defaults and Sibu's actual input resolution without executing a run or calling a model. If a required default is missing or unavailable, report the block and save an explicit compatible choice before claiming readiness. Only for `--case <case-id>` may `--model <target-model>` or `--judge <judge-model>` express temporary run-only choices; they do not change suite defaults. A blocked check is not runnable proof.

Preserve existing Git rules and append root `/evals/artifacts/` only when needed. Verify effective ignore (`git check-ignore --no-index evals/artifacts/probe.json`) and no tracked contents (`git ls-files -- evals/artifacts`). A later negating rule, missing Git or tracked artifacts needs user guidance; never delete/untrack automatically. Do not create results or tracked placeholders. Keep ignored artifacts out of ordinary agent context. End with created paths, prerequisites, conventional test results, retained coverage gaps and a later direct-protocol invocation guide; do not execute the suite while authoring.
