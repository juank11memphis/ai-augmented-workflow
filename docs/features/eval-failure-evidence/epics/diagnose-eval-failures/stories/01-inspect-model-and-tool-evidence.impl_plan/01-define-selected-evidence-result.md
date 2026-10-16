# Step: Define the selected evidence result contract and handler

## Goal

Make the existing `headless-eval-result` command slice project one deterministic failed assertion and one bounded field range through fake reader ports before changing infrastructure.

## Scope

- Task ID: EFE-S01-T01; Milestone ID: EFE-S01-M1 (honest selected-evidence contract); Status: pending; Depends on: none
- Story: `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/stories/01-inspect-model-and-tool-evidence.md` (EFE-S01). Sources: `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/epic_brief.md`; `docs/features/eval-failure-evidence/brd.md` REQ-01–REQ-03, REQ-06–REQ-08 and AC-01/02/04/05/06; `docs/features/eval-failure-evidence/sdd.md` headings Owning operations and interfaces, Evidence and ordering contract, Persistence, limits, and selected reads, Main interaction, Quality strategy and planned verification; `.agents/skills/command-pattern/SKILL.md`.
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: command/result + local reader port before adapters, exact raw versus normalized values, typed `not-captured`/`incomplete`/`redacted`/`capture-failed` gaps, bounded selection and byte-range continuation, no inference from suite fixtures; on-demand pointers: SDD `## Evidence and ordering contract`, `## Persistence, limits, and selected reads`; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Extend the existing Local Evals Workbench result command, result, and port with explicit attempt selection and selected field-range intent. Keep the handler transport-agnostic; reject mismatched or nonfailed selection, invalid field locator/offset, and cross-selection reads. The reader port, not the CLI, owns evidence access.
- Define a versioned, workbench-local evidence/reference shape sufficient for ordered model-call inputs, raw text and structured calls, normalized output, delivered tool events, optional attested approved facts, links, byte lengths, and gaps. Do not create a new deep module, general event bus, new redaction policy, judge capture, or template work.
- Plan view: EFE-S01-M1 = T01 handler/fake-port contract and T02 source capture/protocol, evidenced by focused unit tests. EFE-S01-M2 = T03 safe artifact persistence/read, evidenced by store/reader boundary tests. EFE-S01-M3 = T04 CLI, T06 path-disjoint regression repair, then T05 disposable end-to-end verification, evidenced by focused CLI/integration tests and final checks. Story AC-01: T01/T02/T05; AC-02: T01/T02/T05; AC-03: T01/T03/T04/T05; AC-04: T03/T05; T06 restores T02/T04 distribution checks without new Story scope. Flags: none. Task/status list: T01–T04 execution evidence remains in the append-only progress log; T06 pending; T05 blocked with uncommitted edits preserved until T06's reviewed check passes.
- Durable conventions: one ordered Markdown file = one checked Task. Record actual execution in append-only `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/stories/01-inspect-model-and-tool-evidence.impl_plan/progress.log` with entries `Task ID | outcome | actual check result (including pre-commit touched-source-size gate) | commit reference (if any) | blocker | gotchas`; do not create it during planning. Run `node .agents/scripts/check-touched-source-file-lines.mjs` against each Task's still-uncommitted touched source files before its commit and record pass/fail; a final post-commit invocation is not cumulative evidence for earlier Tasks. Later executor/reviewer owns plan identity, approval, branches, commits, and PR. No live model or human QA gate; tests establish faithful capture/retrieval, not LLM diagnosis. Deeper fuzz/mutation and manual QA are omitted because deterministic boundary/integration cases cover this bounded protocol; residual risk is unseen third-party runner payload diversity.

## Files

- `src/modules/local-evals-workbench/headless-eval-result/command.ts`
- `src/modules/local-evals-workbench/headless-eval-result/result.ts`
- `src/modules/local-evals-workbench/headless-eval-result/ports.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.test.ts`
- `src/modules/local-evals-workbench/run-history/contracts.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/headless-eval-result/handler.test.js`; pass: compile succeeds and fake-reader assertions for exact raw/normalized separation, ordered linked context, explicit old/missing/redacted gaps, one selected assertion, byte-range continuation, and wrong-selection refusal pass; expected evidence: passing named deterministic tests, including a runner-reported redacted marker that is neither reconstructed nor labeled raw, with no live model.
- Pre-commit source-size check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: all source files touched by T01 are at most 500 lines; expected evidence: recorded zero exit before T01 commit, with any oversized touched file cohesively split first.
- Result shapes preserve a large retained field via opaque locator, UTF-8 byte length and bounded continuation with lossless encoding, rather than labeling a clipped string as raw. The handler does not construct paths or log payloads (BRD REQ-02/03/06, Story AC-01/02/03).
- Current no-selection summary remains compact; result-state behavior is explicit rather than inventing a model-failure cause.
