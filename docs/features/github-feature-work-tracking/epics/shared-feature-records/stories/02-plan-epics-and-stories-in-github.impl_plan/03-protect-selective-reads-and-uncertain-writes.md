# Step: Protect selective reads and uncertain writes

## Goal

Make Epic/Story planning load only the published context needed for its stage and resolve ambiguous remote writes by target readback before retrying or advancing.

## Scope

- Task ID: GFW-S02-T03; Milestone ID: GFW-S02-M02 (safe publication and engineer handoff); Status: done; Depends on: GFW-S02-T02.
- Story acceptance criteria: AC-03; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-09/AC-06, `docs/features/github-feature-work-tracking/sdd.md` first Mermaid flow and State, Safety, and Operational Visibility require published prerequisites only, transient session context, intended repository/issue/artifact before write, readback on timeout/ambiguous response, no duplicate create, and stop on missing/conflicting content or capabilities. On-demand pointers: `docs/features/github-feature-work-tracking/sdd.md` Quality Strategy and Planned Evidence, Risks and Tradeoffs; `docs/features/github-feature-work-tracking/ux.md` Publish feature documents and Compact terminal: publication unconfirmed. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Extend only the relevant prompt-owned Scrum/planner publication instructions so Epic planning reads confirmed Feature BRD/UX/SDD prerequisites, Story planning reads the required Epic/Story and source artifacts, and neither downloads a feature folder, caches artifacts on disk, repeatedly rereads unchanged context, nor treats an unpublished draft as settled.
- For Epic/Story and plan/progress artifact create/update, distinguish confirmed success from uncertain effect; read back the identified target and compare identity/content before retrying. Stop on stale/conflicting authoritative content, missing issue/artifact access, or unverified publication, naming confirmed effects without claiming completion. Use safe identifiers and failure categories, never full private content or credentials in logs/status.
- Do not add issue-artifact version history, migration, a runtime GitHub adapter, or unrelated checked-Task resumption behavior.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md` (planning handoff only)
- `templates/manifest.json`
- `src/modules/template-catalog/templates-feature-planning-readback.test.ts` (new focused test)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-feature-planning-readback.test.js`; pass: both exit 0 and fake-MCP trace cases cover selective published prerequisite reads, no on-disk cache, missing native hierarchy/artifact capability, missing or stale content, uncertain issue/artifact write readback, duplicate prevention, and honest partial-effect stop; expected evidence: named passing cases and operation traces showing no unsafe retry, downstream read, or local feature write after a blocker. This answers SDD fake-MCP edge/failure and regression coverage, not actual MCP semantics.
- Distinct remote effects are reported separately; an uncertain issue/artifact operation is never presented as confirmed or retried blindly. Task 1/2 focused contracts still pass if their guidance is touched.
- Changed managed templates have manifest version bumps/sync notes; touched source tests remain at or below 500 lines.
