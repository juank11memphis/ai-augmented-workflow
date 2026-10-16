# Step: Align the agent-facing override flow

## Goal

Make CLI/agent-facing Workbench operations expose the same case override and blocked-choice results as the UI, without agent-side model inference.

## Scope

- Task ID: EMD-S03-T06; Milestone ID: EMD-S03-M3 (surface parity); Status: done; Depends on: EMD-S03-T02, EMD-S03-T03, EMD-S03-T04.
- Story acceptance criteria: AC-03, AC-04, AC-05. Source decisions: `brd.md` REQ-02/05/06, AC-05/06; `sdd.md` UI/CLI thin adapters, same resolver and precise blocked outcomes, per-case result evidence; `ux.md` explicit agent-guided Replace or Inherit wording. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Run Evidence, Presentation, and Compatibility, Security, Failure, and Operational Behavior; `ux.md` → Interaction States and Recovery. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md` (only if local agent instructions change).
- Owning area: Local Evals Workbench agent-facing CLI and composition. Expose explicit case-scoped save/reset via the shared choice handler, and preview/start blocked outcome with affected case/role and permitted replacement or inheritance; do not invent a default, silently clear an unavailable override, or continue after a block. Ensure run/read JSON carries actual per-case tested/judge models and old-history read fallback, not current saved defaults. Keep parsing/transport thin.
- Add deterministic CLI contract tests with fake project/runner and no live agent/model. If only template guidance needs modification, leave executable CLI contract unchanged and prove existing route parity; reserve distributed template edits for T07.

## Files

- `src/entrypoints/cli/{evals-json,evals-json.test}.ts`
- `src/modules/local-evals-workbench/headless-composition.ts`
- `src/modules/local-evals-workbench/headless-composition.test.ts`
- Directly related CLI request parser/response files only if the existing command interface needs case-scoped mutation.

## Done when

- Task check: after `pnpm run build`, `node --test bin/entrypoints/cli/evals-json.test.js bin/modules/local-evals-workbench/headless-composition.test.js`; pass: zero failed tests; expected evidence: fake CLI/agent invocation can explicitly set/reset one case role, sees identical blocked case/role and Replace/Inherit options before execution, does not mutate on preview/run-only choice, and reads actual per-case model labels (including old history). This is SDD agent-surface parity and fake-port regression evidence for REQ-02/05/06 and Story AC-03/04/05.
- Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before commit. Static prompt/CLI tests cannot prove a live agent follows guidance; live eval is excluded.
