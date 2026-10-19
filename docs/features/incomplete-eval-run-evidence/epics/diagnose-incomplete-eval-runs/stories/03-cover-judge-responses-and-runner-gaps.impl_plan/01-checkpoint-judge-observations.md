# Step: Checkpoint judge observations before grading completes

## Goal

Extend the existing execute-run command slice so judge-call bytes and gaps survive a grading error without inventing a judgment.

## Scope

- Task ID: IERE-S03-T01; Milestone ID: IERE-S03-M01 (truthful two-role capture); Status: completed; Depends on: none.
- Story acceptance criteria: AC-01, AC-02; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01, REQ-02, REQ-04–REQ-06 and AC-01–AC-03; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches (sequence diagram), State, limits, and inspection, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench execute-eval-run command/result/port/handler and run-history contracts. Add explicit provider role and judge rubric/check identity to v3 response observation, gap, persisted reference and range-selection contract. Preserve legacy v3 tested-model events by interpreting omitted role as tested-model, but require explicit role and declared check identity for judge events. A call ID cannot ambiguously identify two records in one attempt. Keep exact observed bytes independent of v2 `judge-exchange.response`, scores, and completed turns.
- Handler fake-port tests prove judge bytes are durably saved and an incomplete attempt checkpointed before `rubric-judgment-error`, runner report, or unexpected exit; no score, completed comparison, assertion failure, or completed case is fabricated. Cover judge `not-observed`, `not-emitted`, `capture-failed`, and interrupted response; distinguish Sibu's observed-but-failed body persistence as `not-persisted` when its gap checkpoint succeeds, otherwise return explicit storage failure. Apply this Sibu-side distinction to tested-model calls too. Keep existing S01 provenance and S02 tested-model behavior.
- Story-plan view: IERE-S03 at `docs/features/incomplete-eval-run-evidence/epics/diagnose-incomplete-eval-runs/stories/03-cover-judge-responses-and-runner-gaps.md`; upstream `docs/features/incomplete-eval-run-evidence/epics/diagnose-incomplete-eval-runs/epic_brief.md`, `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01–REQ-08/AC-01–AC-05, `docs/features/incomplete-eval-run-evidence/sdd.md` (including sequence and Quality strategy), `docs/architecture.md` §§ Operation contract, Interaction and module collaboration, Local Evals Workbench; selected architecture `command-pattern`; UX none; Flags: none (Story and Epic). M01 T01→T02 establishes judge checkpoint and v3 protocol; M02 T03→T04 establishes selected artifacts and incident acceptance. AC-01 → T01,T02,T03,T04; AC-02 → T01,T02,T03,T04; AC-03 → T04; AC-04 → T02,T04. Ordered Task/status list: T01 done, T02 done, T03 done, T04 done.
- Durable progression: append-only execution log `03-cover-judge-responses-and-runner-gaps.impl_plan/progress.log`, entry shape `Task ID | outcome | actual check/result | evidence for each Done when | commit reference if present | blocker | gotchas`. Completed Task evidence and commits are recorded there; no human approval is claimed. The main agent retains Story PR integration and human-decision controls.
- Validation convention: build before each focused compiled `node --test` command; record build and named-test exits. Focused checks answer SDD fake-port unit, protocol/artifact contract, and disposable fake-runner CLI acceptance methods near the work. After stabilization, run exactly once `pnpm verify` (canonical build/all compiled tests), once `pnpm run validate:packed-runtime` (distinct packaged runtime/template behavior), `node .agents/scripts/check-touched-source-file-lines.mjs`, and `git diff --check`; capture exits and inspect CLI→command→handler→ports→adapters dependency direction. No redundant final standalone tests. No live model, GeniusCR edit, dashboard, separate QA, mutation, or fuzz; bounded invariant/edge tests address the risk. Residual human limits: evidence interpretation and external-runner implementability are PR judgments, not routine QA gates; fake runners do not prove real traffic is captured.

## Files

- `src/modules/local-evals-workbench/run-execution/contracts.ts`
- `src/modules/local-evals-workbench/run-history/contracts.ts`
- `src/modules/local-evals-workbench/execute-eval-run/handler.ts`
- `src/modules/local-evals-workbench/execute-eval-run/judge-response-checkpoint.test.ts` (new)

## Done when

- Task check: `pnpm build`; pass: result/port/handler contracts compile with no type errors; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/execute-eval-run/judge-response-checkpoint.test.js bin/modules/local-evals-workbench/execute-eval-run/provider-response-checkpoint.test.js`; pass: named fake-port cases show save-before-checkpoint, exact judge role/check/call/turn links, response-before-grading-error, distinct gaps and storage failure, and no fabricated completed judgment; expected evidence: passing test names and fake-store snapshots.
- Judge and tested-model observations use the same command slice and injected store port; handler code has no subprocess, CLI, or filesystem policy. Routine structured logs contain safe IDs/counts/reasons only, not the synthetic raw-body sentinel.
- Evidence class: unit, edge/failure, invariant, S02 regression. This Task does not assert v3 event parsing, file durability, or CLI reading; T02–T04 do.
