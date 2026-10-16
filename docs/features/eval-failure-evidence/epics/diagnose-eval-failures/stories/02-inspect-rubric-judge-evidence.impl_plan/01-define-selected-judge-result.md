# Step: Define selected rubric evidence in the result slice

## Goal

Expose the evaluated rubric, scoring comparison, actual Judge Model, and typed judge-evidence state through the existing selected-result command using fake reader ports.

## Scope

- Task ID: EFE-S02-T01; Milestone ID: EFE-S02-M1 (truthful rubric contract); Status: done; Depends on: none.
- Story: `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/stories/02-inspect-rubric-judge-evidence.md`. Sources: `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/epic_brief.md`; `docs/features/eval-failure-evidence/brd.md` REQ-04/05/06/08, AC-02/03/04/06; `docs/features/eval-failure-evidence/sdd.md` (including `## Main interaction`); `docs/architecture.md` § Local Evals Workbench; selected `.agents/skills/command-pattern/SKILL.md`.
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: actual evaluated rubric, numeric score, threshold, and comparison are separate from raw judge text; deterministic checks never imply judge scoring; absent judge payloads are typed `not-captured`/error gaps, not fabricated from suite fixtures. On-demand pointers: SDD `## Evidence and ordering contract`, `## Failure behavior and operational safety`, `## Quality strategy and planned verification`; BRD `## Requirements` REQ-04–06.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- In the existing Local Evals Workbench `headless-eval-result` slice, extend Result and module reader-port contracts first, then handler projection and fake-reader tests. Keep score/threshold and comparison on the selected assertion; add a distinct versioned judge exchange with exact-field locators and typed gaps. Retain existing model/tool source projection and bounded field-range command. No direct file access or runner inference in the handler.
- A malformed/failed judge response with no valid score must not become a failed model assertion; expose available judge error or gap in the selected grading evidence when it exists, otherwise preserve run/case error state without inventing an assertion locator. No automatic judge-disagreement verdict.
- Plan view: M1 = T01 result contract and T02 validated runner protocol, evidenced by fake-port and protocol unit tests. M2 = T03 linked safe artifact storage/read and T06 repair of the handler's scored-judge checkpoint, evidenced by artifact boundary and real-store handler tests. M3 = T04 disposable artifact-to-CLI proof and T05 distributed runner guidance plus same-Task global-version test correction, evidenced by integration/contract tests and final checks. AC-01: T01–T04/T06; AC-02: T01/T02/T04/T06; AC-03: T01–T04/T06; AC-04: T01/T03/T04/T05. Flags: none. Task/status list: T01–T04 and T06 done (see append-only progress log); T05 blocked for reviewed continuation, with its four uncommitted template/contract-test edits preserved. T06 repaired a prior path-disjoint regression before T04 resumed. The seven stale global-version assertions depend on T05's still-uncommitted manifest bump, so their repair belongs to that **same T05 commit**, not a separate Task. T05 retains its original focused check and single-commit authority.
- Durable conventions: one ordered Markdown file is one checked Task. Append actual execution only to `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/stories/02-inspect-rubric-judge-evidence.impl_plan/progress.log` as `Task ID | outcome | actual check result incl. precommit source-size gate | commit reference if any | blocker | gotchas`; do not create execution evidence while planning. Before each Task commit, run `node .agents/scripts/check-touched-source-file-lines.mjs` against its uncommitted touched source files and record pass/fail; touched files must finish ≤500 lines, split cohesively if needed. Final validation after stabilization: run `pnpm verify` once (build and compiled deterministic tests) and `pnpm run validate:packed-runtime` once because CLI/runtime and distributed runner guidance are affected; do not duplicate those checks merely for permission. No live judge, human QA gate, fuzz, or mutation: fixed fake payloads and boundary cases answer the SDD methods; residual risk is unknown project-runner payload diversity and human interpretation of judge disagreement. Later main agent owns review, acceptance, branch, commits, and PR; this plan is not approved.

## Files

- `src/modules/local-evals-workbench/headless-eval-result/result.ts`
- `src/modules/local-evals-workbench/headless-eval-result/ports.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.test.ts`
- `src/modules/local-evals-workbench/run-history/contracts.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/headless-eval-result/handler.test.js`; pass: fake-reader tests distinguish exact judge request/response/rationale fields from score/threshold/comparison, deterministic checks have no judge exchange, old-run judge gap is `not-captured`, and malformed/failed judge state does not claim a model failure; expected evidence: named passing unit tests with exact synthetic strings and a rejected cross-selection field locator (SDD unit and boundary methods; Story AC-01/02/03).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T01 touched sources ≤500 lines; expected evidence: result recorded before this Task's commit.
- The result remains a bounded selected JSON projection with no raw judge content in compact summary or operational logs. Source-file size and type checks pass; no product rule or rubric is changed.
