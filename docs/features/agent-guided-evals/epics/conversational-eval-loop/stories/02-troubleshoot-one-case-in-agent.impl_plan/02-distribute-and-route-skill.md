# Step: Distribute and route the mandatory skill

## Goal

Install the same guided-evals skill for Codex and Claude Code and route natural eval-troubleshooting requests without changing eval-authoring or browser behavior.

## Scope

- Task ID: AGE-US-02-T02; Milestone ID: AGE-US-02-M02 (reviewable template-catalog integration); Status: done; Depends on: AGE-US-02-T01.
- Story acceptance criteria: AC-01, AC-05; BRD `docs/features/agent-guided-evals/brd.md` REQ-01, REQ-08, REQ-10, AC-01, AC-03, AC-07. Source decisions: Template Catalog owns target identity/routing; retain existing mandatory eval-authoring guidance, shared suites/evidence and `sibu evals` browser default. On-demand pointers: SAD §Template Catalog and §Local Evals Workbench; SDD §§Architecture and responsibilities, Quality strategy; `src/modules/template-catalog/mandatory-skills.ts`, `templates/AGENTS.md`, `templates/CLAUDE.md`, `templates/manifest.json`. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`.
- Register `skills/agent-guided-evals/SKILL.md` in the mandatory catalog for Codex and Claude Code; keep one shared target under `.agents/skills/`, deduplicated when both hosts are selected. Do not incidentally require it for Gemini, which this Story does not promise. Keep authoring distinct and mandatory.
- Add routing to `templates/AGENTS.md` for natural eval run/troubleshooting language and clarify the boundary with eval-authoring creation/maintenance requests. Claude's `CLAUDE.md` delegates to AGENTS; only change Claude-specific template if necessary, not reflexively. Do not introduce a flag.
- In the same Task as the `templates/AGENTS.md` route edit, bump `templates/manifest.json` global templateVersion and AGENTS template version, replacing only AGENTS `changes` with current-version user-facing sync notes. T01 already owns the new skill's manifest entry/version/note; preserve that entry and do not bump it again unless this Task actually edits the skill. If `templates/CLAUDE.md` needs a distinct edit, bump its own version/note in this same Task. Preserve customized-workflow protection and `sibu init` behavior. `mandatory-skills.ts` is near 250 lines; if expected edits push any touched source beyond 500 lines, split by cohesive catalog responsibility before the size gate, not mechanically.

## Files

- `src/modules/template-catalog/mandatory-skills.ts`
- `templates/AGENTS.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts`

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/template-catalog/templates-agent-guided-evals.test.js`; pass: focused tests prove mandatory Codex/Claude target resolution, combined-selection deduplication, routing distinction, existing authoring registration, and per-Task manifest version/current sync notes without a duplicate skill bump; expected evidence: named passing tests and matching template metadata. This is static/catalog evidence, not live-agent behavior (SDD §Quality strategy, deterministic unit tests; Story AC-01/AC-05).
- Test fixture inspection shows no browser launch or authoring target removal, no new eval engine or mutation endpoint, and natural troubleshooting routes to the separate skill.
- Human-judgment limit: routing tests cannot prove natural-language triggering in either host; AC-01 still needs separately authorized disposable live-agent observation.
