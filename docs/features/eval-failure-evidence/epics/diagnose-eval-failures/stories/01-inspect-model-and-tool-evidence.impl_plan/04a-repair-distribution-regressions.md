# Step: Repair committed template-version and packed CLI regressions

## Goal

Restore verification of the T02 template-version and T04 explicit-attempt changes without touching the blocked T05 implementation edits.

## Scope

- Task ID: EFE-S01-T06; Milestone ID: EFE-S01-M3; Status: pending; Depends on: EFE-S01-T02, EFE-S01-T04; precedes EFE-S01-T05
- Story acceptance criteria: AC-03, AC-04 (regression support only); source decisions: `templates/manifest.json` global `templateVersion` is 229 after T02, and T04 requires an explicit attempt for selected `sibu evals result`; on-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Owning operations and interfaces`, `## Quality strategy and planned verification`; `docs/features/eval-failure-evidence/brd.md` REQ-06/08; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Correct stale global-version expectations in the narrow template-catalog tests that still assert `228`, matching the actual T02 manifest version `229` while preserving each unchanged template's own version and sync-note assertions. Do not change `templates/manifest.json` or unrelated template guidance.
- Add `--attempt 1` to the packed headless selected-result probe at `scripts/validate-packed-headless-evals.mjs` while preserving its selected assertion, JSON bound, and installed-runtime assertions. Do not loosen the T04 CLI requirement or touch T05-owned source/tests.
- The first aggregate rerun identified two failing tests in T05-owned `headless-eval-result/handler.test.ts`, not in T06 paths. Before retrying this unchanged T06 check, require the reviewed no-commit T05 preflight in `05-prove-disposable-evidence-path.md` to pass; do not edit or commit T05 files under T06. If another failure appears outside these attributable paths, stop for new attribution and review rather than expand this Task. T05 keeps its uncommitted edits and single-commit authority; T06 may commit only these regression paths after its check.

## Files

- `src/modules/template-catalog/templates-unattended-epic-handoff.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-base.test.ts`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts`
- `src/modules/template-catalog/retirements.test.ts`
- `scripts/validate-packed-headless-evals.mjs`

## Done when

- Task check: `pnpm verify` then `pnpm run validate:packed-runtime`; pass: the full compiled suite has no stale global-template-version assertions and the installed CLI smoke selects the failed assertion using `--case`, `--attempt 1`, and `--assertion` without bypassing any result validation; expected evidence: zero exits and named passing template-catalog and packed-headless checks. These exact aggregate checks are necessary here because the reported failure output was truncated and the packed probe runs only inside packaged-runtime validation.
- Pre-commit source-size check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: all T06-touched source/test files are at most 500 lines; expected evidence: recorded zero exit before T06 commit.
- The T02 manifest stays at version 229, per-template version/sync assertions remain meaningful, and T04's required attempt selector stays enforced. No T05-preserved path is edited; record the exact T06 commit and check outcomes separately from T05's later check and commit.
