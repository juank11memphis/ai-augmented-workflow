# Step: Align CLI registration with the saved-choice command

## Goal

Keep the public agent-facing CLI command inventory accurate without weakening the registration boundary.

## Scope

- Task ID: EMD-S02-T14; Milestone ID: EMD-S02-M5 (distributed, validated increment); Status: done; Depends on: EMD-S02-T05, EMD-S02-T13; blocks EMD-S02-T08.
- Story acceptance criteria: AC-05; source decisions: BRD `REQ-01`, `REQ-06`, `AC-06`; SDD Responsibilities and Contracts, Presentation, Quality Strategy. On-demand pointers: `src/entrypoints/cli/create-program.ts` → evals registration; `src/entrypoints/cli/evals-json.test.ts` → saved-choice CLI contract. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- CLI entrypoint test ownership only: update the stale four-command assertion to require the T05 `choice` command and preserve non-registration of repair/apply/approve commands. Do not change the command implementation to satisfy an obsolete test or touch T08 files.

## Files

- `src/entrypoints/cli/create-program.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/entrypoints/cli/create-program.test.js bin/entrypoints/cli/evals-json.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: exact command inventory includes `choice`, existing agent-facing saved-choice contract still passes, and touched source is ≤500 lines.
- This is deterministic CLI registration regression evidence, not live-agent adherence; no provider call or suite mutation is introduced. Flags: none.
