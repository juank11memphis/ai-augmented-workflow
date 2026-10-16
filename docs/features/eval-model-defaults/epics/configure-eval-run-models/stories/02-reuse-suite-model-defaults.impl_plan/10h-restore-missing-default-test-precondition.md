# Step: Restore the missing-default regression fixture precondition

## Goal

Keep the existing old-suite missing-default assertion meaningful after T17 made the shared offline project fixture represent a ready suite with saved defaults.

## Scope

- Task ID: EMD-S02-T20; Milestone ID: EMD-S02-M5 (distributed, validated increment); Status: done (commit ca3bb09); Depends on: EMD-S02-T19; blocks EMD-S02-T08.
- Story acceptance criteria: AC-02; source decisions: BRD `REQ-01`, `REQ-05`, `AC-01`, `AC-05`; SDD Main Flow and Quality Strategy require old suites without required defaults to block rather than auto-select. On-demand pointers: `src/modules/local-evals-workbench/headless-composition.test.ts` → missing suite default assertion and offline fixture; `src/modules/local-evals-workbench/offline-runner.test.ts` → saved-default ready fixture if needed. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Local Evals Workbench headless-composition test ownership: make the precondition explicit only for the existing old-suite missing-default assertion, using a narrowly scoped no-default suite/fixture override rather than changing T17's shared ready-suite fixture. Preserve the ready-suite default used by T17 offline integration and retain an assertion that the no-default suite blocks with `missing-suite-default` before execution. Touch another adjacent assertion only if it directly shares this fixture and demonstrably requires the old-suite precondition; otherwise keep this Task to the identified test path.
- This is a path-disjoint, bounded test-only repair of the regression attributed to T17's checked fixture change. Do not alter production behavior, weaken missing-default evidence, revert T17, touch T08 template/manifest/template-catalog paths, claim that this is the complete `pnpm verify` failure inventory, or broaden into other stale tests.

## Files

- `src/modules/local-evals-workbench/headless-composition.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/headless-composition.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before this Task's single scoped commit; pass: all exact commands exit zero; expected evidence: the previously failing missing-default scenario reaches `missing-suite-default` with no completed run, saved-default ready cases remain successful, the command output establishes the targeted file's assertions pass, and the size checker reports all T20 uncommitted source changes ≤500 lines. Append actual results, commit reference, blocker, and gotchas to `progress.log`.
- The test-only fixture override proves backward-compatible old-suite blocking while preserving the ready-suite fixture behavior; it does not establish that this is the only aggregate-suite failure. Flags: none.
