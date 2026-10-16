# Step: Extend the version-2 case override contract

## Goal

Recognize independent optional case model overrides without changing old suite discovery or inventing a fallback.

## Scope

- Task ID: EMD-S03-T01; Milestone ID: EMD-S03-M1 (safe saved override contract); Status: done; Depends on: none.
- Story-plan view: Story EMD-S03, `docs/features/eval-model-defaults/epics/configure-eval-run-models/stories/03-override-models-for-individual-cases.md`. Sources: sibling `epic_brief.md`, feature `brd.md` (REQ-02/03/05/06; AC-03/05/06), `sdd.md` (including Main Flow sequence diagram and Quality Strategy), `ux.md`, `docs/architecture.md` §6 Local Evals Workbench, selected `.agents/skills/command-pattern/SKILL.md`. Flags: none (Epic and Story); no removal task.
- Coverage: AC-01 → M1/T01–T02 and M2/T03; AC-02 → M2/T03–T04; AC-03 → M1/T02, M2/T03, M3/T05–T06A, M3/T06D; AC-04 → M2/T04 and M3/T05; AC-05 → M3/T05–T06A, M3/T06D, M4/T07. Ordered outcomes: M1 safe saved override contract (T01 contract fixtures, T02 conditional mutation fixtures); M2 resolved mixed run (T03 fake-port selection/preflight, T04 runner/artifact integration); M3 surface parity (T05 deterministic UI contract, T06 CLI/agent flow, T06A HTTP preview non-mutation fixture, T06B repair saved-default UI close/focus regression, T06C restore cross-task regression assertions, T06D retain blocked-result source regression assertions); M4 distributed and validated increment (T07 template, packed, aggregate evidence). Task status list: T01–T07 done.
- Durable conventions: one bounded checked Task per file; record actual check and every Done-when item before Task commit; use Conventional Commits. Append execution entries only to story-local `progress.log` (non-Markdown), shape `Task ID | outcome | actual check/result | commit reference or none | blocker or none | gotchas`; this plan neither creates execution evidence nor commits. Review/decision fields remain preparatory; main agent controls review, branch, commits/continuation, and PR. Treat `## Files` as expected touchpoints, not an allowlist.
- Source decisions: optional `testedModel`/`judgeModel` (or existing naming convention) on each case mean override; absence means inherit; empty/unsafe IDs invalid; version remains 2; old suites valid. Suite defaults remain required before any run even if a case overrides. Owning module: Local Evals Workbench, suite discovery contract. On-demand pointers: `sdd.md` → Project-Owned Suite Format and Persistence, Responsibilities and Contracts, Quality Strategy and Planned Verification; `brd.md` → REQ-02/03/05, AC-03/05; `.agents/skills/command-pattern/SKILL.md` → Implementation planning. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Extend normalized case types and strict version-2 parsing; preserve unrelated case fields and existing invalid-suite diagnostics. `suite-contract.ts` is already 440 lines: extract a cohesive case-model parser/helper before it would exceed 500; do not mechanically split unrelated code.
- Do not modify runner protocol, `.sibu/state.json`, or historical artifacts.

## Files

- `src/modules/local-evals-workbench/discover-conventional-eval-suites/{suite-contract-types,suite-contract}.ts`
- `src/modules/local-evals-workbench/discover-conventional-eval-suites/suite-contract.test.ts`
- Cohesive case-model parser module if needed for the 500-line gate.

## Done when

- Task check: after `pnpm run build`, `node --test bin/modules/local-evals-workbench/discover-conventional-eval-suites/suite-contract.test.js`; pass: zero failed tests; expected evidence: old version-2 fixture remains valid, each override role independently normalizes, malformed/empty/unknown case model fields fail strict validation, and a missing suite default remains absent rather than synthesized. This is the SDD suite-format method for BRD REQ-02/05 and Story AC-01/03.
- The contract adds no runner or provider behavior. Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before this Task's commit; all touched source files finish ≤500 lines.
