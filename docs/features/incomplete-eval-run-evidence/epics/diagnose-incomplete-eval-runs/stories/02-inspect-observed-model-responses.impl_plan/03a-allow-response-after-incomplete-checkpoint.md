# Step: Permit response persistence after the matching incomplete checkpoint

## Goal

Repair the artifact-store transition guard so a tested-model response can be saved after the execute handler's case-start checkpoint, without weakening run identity, safety, or completeness claims.

## Scope

- Task ID: IERE-S02-T05; Milestone ID: IERE-S02-M02 (safe retained/selected inspection); Status: completed; Depends on: IERE-S02-T03.
- Story acceptance criteria: AC-01, AC-03; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01, REQ-02, REQ-05, REQ-06 and AC-01/AC-03; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, Main flow and failure branches (sequence diagram), State, limits, and inspection, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench run-history artifact adapter only. T03's `FileArtifactStore.saveProviderResponse` currently accepts a running case only when its manifest has zero attempts, but T01 durably appends one matching incomplete attempt at case start. Permit the zero-attempt state already supported by T03 and the matching single incomplete checkpoint for the requested suite/run/case/attempt; keep terminal/completed, wrong-case/attempt, owner, root/path, Git-ignore, and tracked-artifact guards intact. Preserve the existing atomic write and locator-only-after-success behavior.
- Add one focused regression to `provider-response-artifact.test.ts`: create/start run, append the matching incomplete case-start attempt, save an observed response, append its reference, reopen the selected exact bytes, and assert no completed turn/assertion/case was fabricated. Include negative assertions for completed or mismatched checkpoints and retain the existing file-safety tests. Do not alter T04's unstaged CLI, template, or documentation paths; its oversized fixture adjustment remains T04 work.

## Files

- `src/modules/local-evals-workbench/run-history/file-artifact-store.ts`
- `src/modules/local-evals-workbench/run-history/provider-response-artifact.test.ts`

## Done when

- Task check: `pnpm build`; pass: the narrowed transition guard and focused test compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/run-history/provider-response-artifact.test.js bin/modules/local-evals-workbench/run-history/file-artifact-store.test.js bin/modules/local-evals-workbench/run-history/git-artifact-safety.test.js`; pass: the new checkpoint-then-observation case returns a durable locator and byte-exact selected read, while wrong/completed/foreign attempts and unsafe or tracked paths stay blocked, prior artifact tests pass, and no completed state is fabricated; expected evidence: passing named regression and safety tests with persisted/reopened fixture assertions.
- The repair changes only the artifact-store transition condition and directly necessary focused test; it does not touch/stage T04's preserved files or change response limits, capture statuses, runner protocol, or the prescribed T04 checks.
- Evidence class: artifact contract regression, state-transition invariant, edge/failure, safety regression. No live model or separate QA is added; T04 still owns public CLI acceptance.
