# Inspect Exact Model and Tool Evidence

**Story ID:** EFE-S01

## Epic
[Diagnose Eval Failures from Selected CLI Evidence](../epic_brief.md)

**Status:** ready-for-planning

## User Story
As an engineer diagnosing a failed deterministic eval assertion, I want the selected CLI result to show the actual model reply and context it received, so that I can explain the observed failure without relying on a paraphrase or bulk artifact.

## Context and Source Traceability
- BRD: [`../../../brd.md`](../../../brd.md), REQ-01–REQ-03, REQ-06–REQ-08; AC-01, AC-02, AC-04–AC-06.
- SDD: [`../../../sdd.md`](../../../sdd.md), Owning operations and interfaces, Evidence and ordering contract, Persistence, limits, and selected reads, Main interaction, and Quality strategy.
- Domain and capability: Local Evals Workbench Eval Run/Result and Tool Interaction Expectation; Preserve isolated run evidence and Inspect failure evidence in `docs/capabilities-map.md`.
- UX: not applicable.

## In Scope
- Capture actual ordered model-call inputs, raw response text and structured tool calls, normalized output, delivered tool requests/results, and approved-fact provenance when supplied by a capable runner.
- Persist and read one failed deterministic assertion's linked turn/context evidence with explicit gaps for old or incomplete capture.
- Return a bounded selected CLI result and safe field continuation for retained evidence; keep run output limited to locators.

## Out of Scope
- Rubric-judge request/response capture, new privacy/redaction policy, and dashboard changes.

## Acceptance Criteria
- **AC-01 — Exact relevant reply:** A selected failed multi-turn deterministic assertion returns the raw assistant text and structured tool calls separately from the normalized output; fake-payload comparisons show no paraphrase or wrong-turn substitution (BRD REQ-02, REQ-08). Verification: test.
- **AC-02 — Actual context:** The selected result shows ordered messages, preceding conversation, delivered tool requests/results, and available approved-fact provenance for the relevant call; unavailable source fields are marked rather than inferred from a fixture (BRD REQ-03, REQ-06). Verification: test.
- **AC-03 — Bounded retrieval:** A large retained field is explicitly truncated in the normal selected result and can be reconstructed through field continuations; the full-suite result contains locators but no transcript (BRD REQ-01, REQ-06). Verification: test.
- **AC-04 — Safe persistence:** Detail survives an artifact save/reopen, while unignored or tracked artifact paths block storage and raw payloads do not enter operational logs (BRD REQ-07, REQ-08). Verification: test.

## Verification Expectations
- Fake model/tool unit tests prove exact content, structured-call shape, turn/attempt ordering, and normalized-versus-raw separation.
- Disposable artifact-to-CLI integration tests prove persistence, selected projection, continuation reconstruction, old-run `not-captured` markers, and wrong-selection refusal.
- Boundary tests cover large/incomplete evidence and Git-ignore/tracked-artifact safeguards. No live model or human QA gate.

## Validation
- Focused deterministic tests for runner events, artifact store/reader, selected result, and CLI JSON; `pnpm verify`; `pnpm run validate:packed-runtime` when CLI packaging is affected.

## Domain Context
Primary bounded context: Local Evals Workbench. The Eval Run records an Eval Result and one assertion's source evidence; project-runner events cross the execution boundary. No change to the repair approval lifecycle.

## Technical Context
Extend the existing run/result command slices and their runner/artifact adapters as described by the SDD. Keep exact source payloads out of manifests, normal run output, and logs; use versioned capture and safe selected reads.

## UX References
not applicable.

## Non-Functional Criteria
Selected output is bounded with explicit loss/gap markers and retrievable retained bytes; artifact paths remain safely scoped and effectively Git-ignored (BRD REQ-06–REQ-07).

## Deployability and Feature Flag
**Behind flag:** no.
The deterministic-assertion CLI path works end to end on its own. Older runners and artifacts remain readable with explicit `not-captured` fields; rubric cases retain their current behavior until EFE-S02.

## Dependencies
Blocks EFE-S02 and EFE-S03; no preceding Story dependency.

## Open Questions and Assumptions
Accepted assumption: project runners must emit the versioned evidence extension to provide source payloads; Sibu does not reconstruct missing payloads from suite definitions. No unresolved material question.
