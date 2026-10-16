# Step: Wire the bounded selected CLI result

## Goal

Expose selected assertion evidence and field continuation through a thin CLI adapter while keeping full-run output compact.

## Scope

- Task ID: EFE-S01-T04; Milestone ID: EFE-S01-M3 (usable locator-to-evidence CLI); Status: pending; Depends on: EFE-S01-T03
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: explicit `--case`, `--attempt`, `--assertion`, optional `--field`/`--offset`; no filesystem reads or diagnosis in CLI; run output only locators and states, with explicit locator continuation if the existing fixed list truncates; on-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Owning operations and interfaces`, `## Main interaction`, `## Persistence, limits, and selected reads`; `docs/features/eval-failure-evidence/brd.md` REQ-01/06/08; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Route explicit attempt and field-range input into the existing result command via composition. Translate typed ready/gap/blocked outcomes to stable JSON; reject invalid option combinations, wrong selection, or unsafe offset. Keep JSON budget enforced on ordinary selected output and each continuation.
- Update local CLI documentation for run locator → selected failed assertion → field continuation and explicit not-captured/capture-failed semantics. Point runner authors to the T02 managed producer contract rather than duplicate its wire format here; do not modify other Sibu templates or unrelated workflow instructions.

## Files

- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/evals-json.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `src/entrypoints/cli/evals-json.test.ts`
- `src/modules/local-evals-workbench/headless-composition.ts`
- `src/modules/local-evals-workbench/headless-eval-run/handler.ts`
- `src/modules/local-evals-workbench/run-history/failed-assertion-locators.ts`
- `README.md`

## Done when

- Task check: `pnpm build` then `node --test bin/entrypoints/cli/create-program.test.js bin/entrypoints/cli/evals-json.test.js bin/modules/local-evals-workbench/headless-eval-run/handler.test.js`; pass: CLI option/JSON tests prove explicit attempt and field selection, bounded output, no transcripts in run JSON, ordered or continuable locators, and wrong-selection refusal; expected evidence: named deterministic CLI and regression tests.
- Pre-commit source-size check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: all source files touched by T04 are at most 500 lines; expected evidence: recorded zero exit before T04 commit, with cohesive splitting if needed.
- CLI delegates evidence reads to workbench handler/ports and does not infer failure cause (BRD REQ-01/08; Story AC-01/02/03).
- README gives executable local CLI examples and distinguishes old-run not-captured from a raw provider response; no claim that Git-ignore is complete privacy protection (BRD REQ-07/08).
