# Step: Capture validated model and tool source events

## Goal

Extend the existing runner execution slice to accept versioned exact source evidence and link it to the evaluated deterministic assertion.

## Scope

- Task ID: EFE-S01-T02; Milestone ID: EFE-S01-M1; Status: pending; Depends on: EFE-S01-T01
- Story acceptance criteria: AC-01, AC-02, AC-04; source decisions: keep version-1 runner events working, add a versioned extension, validate identity/sequence/attempt/turn/check links and complete chunks before publishing references, distinguish provider raw response from normalized output and post-tool continuation; on-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Evidence and ordering contract`, `## Main interaction`, `## Failure behavior and operational safety`; `docs/features/eval-failure-evidence/brd.md` REQ-02/03/06/08; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`.
- Add only Local Evals Workbench protocol and execution types/validation needed for model-call inputs, raw provider text and structured calls, normalized output, delivered tool request/results, optional attested approved-fact provenance, timing/order markers and assertion links. Preserve exact UTF-8 payload bytes; do not substitute fixture-declared inputs or reconstruct old-run raw data.
- Keep runner process and event limits explicit. Reject duplicate IDs, reordered/cross-attempt links, malformed or incomplete chunks, and false complete claims. Pass validated complete records and typed capture-gap events separately to the run slice without claiming they are durable; T03 must persist earlier complete records and explicit gaps across interruption or limit failure before the Story can claim retention. Keep payloads out of operational log fields. Do not capture rubric judge exchanges in this Story.
- Update the established distributed runner-authoring reference to document how a project runner emits this extension: version negotiation and old-runner behavior; envelope identity, sequence and ordering; chunk completion; assertion/turn/tool links; runner-reported redaction markers; and one minimal valid deterministic event example checked against the actual validator. Reconcile its old no-full-response advice only for explicitly retained selected evidence; do not relax credential or uncertain-redaction safety. As this is template work, bump global and changed-template versions in `templates/manifest.json`, replace that template's `changes` with current-version user-facing sync notes, and verify install/sync exposure without overwriting customized targets.

## Files

- `src/modules/local-evals-workbench/run-execution/contracts.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.ts`
- `src/modules/local-evals-workbench/runner-process/execute-events.test.ts`
- `src/modules/local-evals-workbench/runner-process/execute-adapter.ts`
- `src/modules/local-evals-workbench/runner-process/execute-adapter.test.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.ts`
- `src/modules/local-evals-workbench/run-execution/attempt-evidence.test.ts`
- `templates/skills/eval-authoring/references/version-2-contract.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-eval-authoring-contract.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/runner-process/execute-events.test.js bin/modules/local-evals-workbench/runner-process/execute-adapter.test.js bin/modules/local-evals-workbench/run-execution/attempt-evidence.test.js`; pass: fake model/tool events preserve exact raw text, structured call shape, normalized output, delivered results, ordered context, turn/attempt links and honest gaps while malformed order/chunks/links fail; expected evidence: named unit and edge/failure tests, no live model.
- Documentation check: `node --test bin/modules/template-catalog/templates-eval-authoring-contract.test.js`; pass: the managed reference and manifest expose the versioned producer contract and current-version sync note, and its minimal deterministic example is accepted by the production event validator while an invalid link/chunk is rejected; expected evidence: named deterministic contract and template-distribution tests, not a text-only presence assertion. Include disposable install/sync preview coverage in this test or an existing focused template lifecycle test; `pnpm verify` in T05 remains the required template-change aggregate check.
- Pre-commit source-size check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: all source files touched by T02 are at most 500 lines; expected evidence: recorded zero exit before T02 commit, with cohesive splitting if needed.
- A capable runner can deliver complete versioned source evidence to the run slice; an older valid protocol remains accepted but never claims source fields were captured (Story AC-01/02; BRD REQ-02/03/08).
- Run/execution logs contain only safe event names, IDs, counts, states and error codes, never raw messages, calls, tool results or credentials (Story AC-04; BRD REQ-07).
