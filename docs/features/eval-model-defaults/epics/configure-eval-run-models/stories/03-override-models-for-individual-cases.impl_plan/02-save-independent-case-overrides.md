# Step: Save one case override without altering other choices

## Goal

Extend the existing saved-choice command slice so a case can set or reset either role safely and independently.

## Scope

- Task ID: EMD-S03-T02; Milestone ID: EMD-S03-M1 (safe saved override contract); Status: done; Depends on: EMD-S03-T01.
- Story acceptance criteria: AC-01, AC-03, AC-05. Source decisions: `brd.md` REQ-02/05, AC-03/05; `sdd.md` Change saved model choice, project-file safety, compare-before-write, explicit reset to inheritance, safe structured events. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Project-Owned Suite Format and Persistence, Security, Failure, and Operational Behavior; `ux.md` → Interaction States and Recovery. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning module: Local Evals Workbench `change-saved-model-choice` slice. Add optional case ID to Command/Result and port, validate case existence and role/model compatibility in the Handler, then extend the project-file adapter to change only that case field; absent case field means inherit, while a suite reset still means unset. Expose the same operation through the thin saved-choice route and its GET snapshot, including case overrides and token.
- Keep current existing-root/`evals/` path confinement, no-symlink policy, full-suite revalidation, compare-before-write token, atomic replacement, unchanged-file failure guarantee, and safe logging. Cancellation never calls mutation; run-only choices never use this command. Do not substitute another model or persist provider responses.

## Files

- `src/modules/local-evals-workbench/change-saved-model-choice/{command,result,ports,handler,project-file-adapter}.ts`
- `src/modules/local-evals-workbench/change-saved-model-choice/{handler,project-file-adapter}.test.ts`
- `src/modules/local-evals-workbench/start-local-evals-workbench/{saved-choice-route.ts,local-server-suite-contract.test.ts}`.

## Done when

- Task check: after `pnpm run build`, `node --test bin/modules/local-evals-workbench/change-saved-model-choice/handler.test.js bin/modules/local-evals-workbench/change-saved-model-choice/project-file-adapter.test.js bin/modules/local-evals-workbench/start-local-evals-workbench/local-server-suite-contract.test.js`; pass: zero failed tests; expected evidence: case-only tested/judge set/change/reset leaves the other role, suite defaults, and unrelated bytes intact; invalid/unavailable case/model, stale token, concurrent edit, symlink/root escape, failed write, and canceled/absent request do not mutate the suite. This is SDD fake-port plus suite-mutation evidence for REQ-02/05 and Story AC-01/03.
- Response and log fields identify safe suite/case/role and precise blocked/conflict reason, never credentials, prompts, rubric content, or raw output. Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before commit; refactor any touched file over 500 lines cohesively.
