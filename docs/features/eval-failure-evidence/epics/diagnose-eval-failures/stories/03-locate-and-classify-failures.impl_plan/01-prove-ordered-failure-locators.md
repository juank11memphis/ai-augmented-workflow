# Step: Prove ordered failure locators across a full run

## Goal

Make every persisted failed assertion reachable from compact, ordered run and result locator pages without exposing transcripts.

## Scope

- Task ID: EFE-S03-T01; Milestone ID: EFE-S03-M1 (reachable compact failure index); Status: done; Depends on: none.
- Story: `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/stories/03-locate-and-classify-failures.md`. Sources: `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/epic_brief.md`; `docs/features/eval-failure-evidence/brd.md` REQ-01/05/06/08 and AC-01/03/04/06; `docs/features/eval-failure-evidence/sdd.md` including `## Main interaction`; `docs/architecture.md` § Local Evals Workbench; selected `.agents/skills/command-pattern/SKILL.md`.
- Story acceptance criteria: AC-01, AC-02; source decisions: full-run output is a compact index, locator order follows persisted case/attempt/assertion order, bounded pages expose an explicit continuation, unavailable failed-attempt evidence is marked rather than guessed. On-demand pointers: SDD `## Owning operations and interfaces` (`headless-eval-run` and `run-history` rows), `## Evidence and ordering contract`, `## Main interaction`, `## Quality strategy and planned verification`; BRD `## Requirements` REQ-01/05/06 and `## Business Acceptance Criteria` AC-01/03/04.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Plan view: M1 = T01, a reachable compact locator index; M2 = T02, truthful selected states and identity; M3 = T03, disposable artifact-to-CLI proof and documentation. AC-01: T01/T03. AC-02: T02/T03. AC-03: T02/T03. AC-04: T03. BRD AC-01: T01/T03; AC-03: T02/T03; AC-04: T03; AC-05: T03; AC-06: T01–T03. Flags: none. Task/status list: T01 pending, T02 pending, T03 pending.
- Durable conventions: one ordered Markdown file is one checked Task. Append actual execution only to `docs/features/eval-failure-evidence/epics/diagnose-eval-failures/stories/03-locate-and-classify-failures.impl_plan/progress.log` as `Task ID | outcome | actual check result including precommit size gate | commit reference if present | blocker | gotchas`; no execution evidence exists yet. Before each Task commit run `node .agents/scripts/check-touched-source-file-lines.mjs` against uncommitted touched source files; record its pass/fail and keep each at ≤500 lines. After stabilization, run `pnpm verify` once (build plus compiled deterministic suite) and `pnpm run validate:packed-runtime` once (installed CLI/package behavior). Final Story PR review and all review/approval, branch, commit, and PR actions belong to the main agent/executor, not this plan; approval state: not approved, independent plan review required.
- In the existing Local Evals Workbench run command/result and `run-history` adapter, first preserve or minimally correct the command/result locator contract and handler behavior. Create `failed-assertion-locators.test.ts` with fake-reader tests for several cases, several attempts, >32 failed assertions crossing a page boundary, exact page continuation to exhaustion, and invalid/absent locator evidence. Keep the result handler transport-agnostic and the CLI thin; do not add a deep module, cause classifier, or capture pipeline.
- Review the existing `failed-assertion-locators.ts` ordering/offset implementation for cross-attempt and cross-case pagination. If it already passes the new contract, leave production code unchanged. Keep S01/S02 score and judge payload capture intact.

## Files

- `src/modules/local-evals-workbench/run-history/failed-assertion-locators.ts`
- `src/modules/local-evals-workbench/run-history/failed-assertion-locators.test.ts` (required new focused tests)
- `src/modules/local-evals-workbench/headless-eval-run/handler.ts`
- `src/modules/local-evals-workbench/headless-eval-run/handler.test.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/run-history/failed-assertion-locators.test.js bin/modules/local-evals-workbench/headless-eval-run/handler.test.js bin/modules/local-evals-workbench/headless-eval-result/handler.test.js`; pass: named fake-reader tests reconstruct the exact ordered failed case/attempt/assertion sequence across all locator pages, stop at a null continuation, distinguish unavailable from truncated, and show no raw sentinel in run JSON or safe logs; expected evidence: passing assertions for multiple cases/attempts and the >32 boundary, with no missing or repeated locator (SDD unit and boundary methods; Story AC-01/02; BRD AC-01/04/06).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T01 touched sources ≤500 lines; expected evidence: the gate result recorded before its commit.
- A failed attempt with inaccessible/corrupt evidence reports `locatorStatus: "unavailable"`, not an invented assertion; run and unselected-result locators remain compatible, bounded, and transcript-free. No raw payload or guessed cause is introduced.
