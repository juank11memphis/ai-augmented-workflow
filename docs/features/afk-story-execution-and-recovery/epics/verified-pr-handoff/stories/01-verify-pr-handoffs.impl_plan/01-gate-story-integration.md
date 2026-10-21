# Step: Gate Story integration on current host and local evidence

## Goal

Make the main-agent Story PR contract require verified, current facts before a squash-only merge, with an honest MCP-first read-only fallback and effect readback.

## Scope

- Task ID: AFK-PR-01-T01; Milestone ID: AFK-PR-01-M01 (safe Story integration); Status: done; Depends on: none.
- Story: `docs/features/afk-story-execution-and-recovery/epics/verified-pr-handoff/stories/01-verify-pr-handoffs.md` (AFK-PR-01). Flags: none; no flag-removal task.
- Story-plan view: M01/T01 covers AC-01, AC-02, AC-03 with focused deterministic contract evidence; M02/T02 covers AC-04, AC-05 with focused Epic/summary assertions and final repository/package evidence. Ordered Tasks: T01 pending, T02 pending. The final Story PR, not either Task check, owns outcome judgment.
- Durable conventions: one checked Task per step; preserve exact accepted plan identity, checked Task commits, each `Done when` item, Story validation, and human Epic PR review; report actual rather than inferred host facts. Progress log guidance: append to `01-verify-pr-handoffs.impl_plan/progress.log` only during execution, one compact entry per Task with Task ID, outcome, actual check/result and observed head, commit reference if any, blocker, gotchas. Do not create the log during planning.
- Source decisions: `docs/features/afk-story-execution-and-recovery/brd.md` REQ-07, AC-04, RULE-05; `sdd.md` **Ownership and boundaries**, **Story and Epic PR handoff**, **Quality strategy and planned verification**. On-demand: Story AC-01–AC-03 and Verification Expectations; `docs/architecture.md` **Template Catalog**. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/command-pattern/SKILL.md` (prompt-only; no runtime Command/Handler/Port).
- Owning areas: main-agent executor skill guidance and Template Catalog distribution. Keep installed and packaged guidance equivalent. Specify the complete premerge evidence gate: exact accepted plan identity, Task commits and every `Done when` item, actual Story-level validation, exact PR head/base and current Story/Epic heads, local branch/index/worktree safety, required host check conclusions bound to the current PR head/base, and observed host merge-policy facts. Do not infer permission from a merge request or local tests.
- For host facts/effects, prefer configured GitHub MCP when capable. State the specific missing read-only capability before the smallest necessary read-only host fallback; keep local Git authoritative for local facts. Missing, pending, failed, stale, unavailable, or ambiguous required facts stop merge; avoid routine broad branch-policy probes and repeated host-approval prompts.
- Permit only squash-only Story integration after all gates. On timeout or possible effect, read back actual PR identity/state/merge method and Epic-head state before retry or next Story; never guess or advance from an ambiguous result. Preserve existing scoped Task-commit and main-only PR authority. No live PR action or new runtime layer.
- Version the changed template and global manifest with current-version user-facing `changes` notes in the same Task. Update existing focused Story contract assertions and add deterministic scenario cases covering MCP available, disclosed narrow fallback, unavailable fact, and ambiguous effect; fixtures model contract decisions only, not live-agent compliance.

## Files

- `.agents/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-story-pr.test.ts`
- `src/modules/template-catalog/templates-unattended-epic-integration.test.ts`
- `src/modules/template-catalog/templates-afk-pr-handoff.test.ts` (new focused scenario contract test)

## Done when

- Task check: `pnpm build` followed by `node --test bin/modules/template-catalog/templates-story-pr.test.js bin/modules/template-catalog/templates-unattended-epic-integration.test.js bin/modules/template-catalog/templates-afk-pr-handoff.test.js`; pass: both commands exit 0; expected evidence: compiled focused assertion results for the four SDD handoff scenarios and exact guidance. This is a deterministic prompt contract, not a live-host or LLM-behavior test.
- Contract cases distinguish MCP-supplied facts (no fallback), a named MCP capability gap (read-only narrow fallback), an unavailable/stale required fact (no merge), and a possibly effective merge (PR plus Epic-head readback before retry/continuation). Assertions bind checks and policy facts to exact current PR head/base and retain checked-Task/Story validation gates.
- Source review confirms no unsafe merge path, no routine broad policy query, no automatic Epic merge introduced, and no sensitive/raw-log publication. Record the inspected sections as Task evidence; judgment about real host behavior remains for the later Story PR.
- Manifest global and executor-template versions advance from observed values, `changes` describes this update only, and packaged/installed guidance matches. Modified `.ts` source stays at or below 500 lines; `node .agents/scripts/check-touched-source-file-lines.mjs` exits 0 with recorded pass/fail evidence.
