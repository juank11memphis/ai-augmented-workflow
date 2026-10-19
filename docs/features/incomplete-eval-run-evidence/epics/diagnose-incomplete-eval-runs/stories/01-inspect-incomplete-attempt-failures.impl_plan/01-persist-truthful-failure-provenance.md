# Step: Persist truthful failure provenance at the last valid checkpoint

## Goal

Extend the existing execute-run command slice so a partial attempt and run retain bounded diagnostics and structured observed failure facts, without converting an incomplete case into an assertion failure.

## Scope

- Task ID: IERE-S01-T01; Milestone ID: IERE-S01-M01 (durable truthful failure evidence); Status: done; Depends on: none.
- Story acceptance criteria: AC-02, AC-03, AC-04; source decisions: `brd.md` REQ-02, REQ-04, REQ-05, REQ-08 and AC-02/AC-05; `sdd.md` “Execution and evidence boundaries”, “Main flow and failure branches”, “State, limits, and inspection”, “Quality strategy — planned, not yet run”; on-demand pointers: `docs/features/incomplete-eval-run-evidence/brd.md` §§ Requirements, Business Rules, Business Acceptance Criteria; `docs/features/incomplete-eval-run-evidence/sdd.md` same headings and sequence diagram; `docs/architecture.md` §§ Operation contract, Local Evals Workbench, Security and operational visibility; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench, existing execute-run slice. Define transport-neutral runner outcome/provenance shape and bounded safe reason/code types first; then handler checkpoint/finalization behavior; then persistence validation. Represent a valid runner terminal error report, process exit, timeout, protocol rejection, and storage failure by observed stage/fact, not a claimed provider/adapter root cause. Preserve both report and exit when supplied together. Keep old artifacts readable when provenance is absent.
- Persist attempt-linked diagnostic codes and observed turn/call identifiers only when actually emitted. Do not invent a turn, assertion, response, or completed case. If storage fails, return `storage-failed`; never assert that failed provenance was durably saved.
- Use fake-port unit tests in a new focused file. Do not add tests to `execute-eval-run/handler.test.ts` (498 lines), or expand another touched source file beyond 500 lines; split by cohesive responsibility if needed.
- No protocol-v3/raw response record, judge capture, GeniusCR edits, dashboard, live model, new deep module, CLI filesystem access, or new logger payload containing output/response text.
- Story-plan view: Story ID IERE-S01; Story path `docs/features/incomplete-eval-run-evidence/epics/diagnose-incomplete-eval-runs/stories/01-inspect-incomplete-attempt-failures.md`; sources: `docs/features/incomplete-eval-run-evidence/epics/diagnose-incomplete-eval-runs/epic_brief.md`, `docs/features/incomplete-eval-run-evidence/brd.md`, `docs/features/incomplete-eval-run-evidence/sdd.md`, `docs/architecture.md`; selected architecture: `command-pattern`; Flags: none. Milestone M01 = durable truthful failure evidence (T01 fake-port persisted checkpoint/provenance; T02 disposable-runner origin/exit/timeout evidence). Milestone M02 = selectable bounded diagnosis (T03 handler and reader selection/counts; T04 CLI end-to-end JSON). AC-01 → M02/T03,T04; AC-02 → M01/T01,T02 and M02/T04; AC-03 → M01/T01 and M02/T03,T04; AC-04 → M02/T03,T04. Ordered status list: T01 pending, T02 pending, T03 pending, T04 pending. Progress log (execution only): `01-inspect-incomplete-attempt-failures.impl_plan/progress.log`, append-only one record per Task with Task ID, outcome, actual command/result, evidence for each Done-when item, commit reference when present, blocker, and gotchas. Plan-review/human-decision fields are preparatory only; this plan does not claim review, execution, or commits.
- Durable validation convention: run `pnpm build` before direct compiled-file `node --test` checks; record each command's exit and named assertions. Final after stabilization: `pnpm verify` once (build plus all compiled tests), `pnpm run validate:packed-runtime` once (distinct installed-package CLI/runtime semantics, relevant because CLI/result and artifacts are distributed), `node .agents/scripts/check-touched-source-file-lines.mjs`, and `git diff --check`. Focused checks are feedback, not replacement for final verification. No separate QA/live-model check: deterministic fake runners prove only Sibu handling of emitted evidence, not real provider or GeniusCR emissions.

## Files

- `src/modules/local-evals-workbench/run-execution/contracts.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.ts`
- `src/modules/local-evals-workbench/run-history/contracts.ts`
- `src/modules/local-evals-workbench/run-history/validation.ts`
- `src/modules/local-evals-workbench/run-history/lifecycle.ts`
- `src/modules/local-evals-workbench/execute-eval-run/failure-provenance.test.ts` (new, focused)
- `src/modules/local-evals-workbench/run-history/validation.test.ts`

## Done when

- Task check: `pnpm build`; pass: TypeScript and runtime assets compile; expected evidence: exit 0, no type error across changed contracts, handler, and artifact validation.
- Task check: `node --test bin/modules/local-evals-workbench/execute-eval-run/failure-provenance.test.js bin/modules/local-evals-workbench/run-history/validation.test.js`; pass: fake-port tests distinguish valid runner report from unexpected exit, retain both report and exit, preserve the last valid incomplete attempt plus bounded linked diagnostics, and reject malformed or oversized provenance; expected evidence: named tests pass with persisted fake-store snapshot and no fabricated assertion/turn/case or raw body in logged metadata.
- Existing manifest/attempt versions remain readable without new provenance; new provenance validates on write/read and cannot promote a diagnostic string to an unsupported root cause. A failed persistence operation yields a truthful storage-failed result rather than a false saved claim.
- Evidence class: unit, invariant, edge/failure, compatibility regression. Skip fuzz/mutation because bounded schema cases and exact branch tests answer this Story's risks; residual risk is runner behavior not exercised by fake ports.
