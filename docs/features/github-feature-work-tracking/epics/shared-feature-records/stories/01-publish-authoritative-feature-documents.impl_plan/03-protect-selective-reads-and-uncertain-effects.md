# Step: Protect selective reads and uncertain publication

## Goal

Make a new stage consume only required published prerequisites in session context and stop safely when a required artifact or external write cannot be confirmed.

## Scope

- Task ID: GFW-S01-T03; Milestone ID: GFW-S01-M02 (safe resumption and honest terminal feedback); Status: done; Depends on: GFW-S01-T02.
- Story acceptance criteria: AC-03, AC-04; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-09/AC-06 and REQ-01/REQ-03; SDD first Mermaid flow plus State, Safety, and Operational Visibility. Published Feature artifacts alone are durable; session context is transient. Before any create/update identify repository, issue, artifact; uncertain response requires target readback before retry; absent/conflicting proof pauses downstream work. On-demand pointers: `sdd.md` Start and publish a feature stage, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence; `ux.md` Publish feature documents, Interaction States and Feedback, publication unconfirmed mockup. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Make stage-entry guidance identify only the published prerequisites needed by BRD, UX, or SDD, retrieve them through MCP into session context once per need, and stop on missing/conflicting artifacts rather than reading unpublished local drafts or creating a cache. Existing project-wide vision/domain/capabilities/SAD remain repo-local according to the SDD.
- Specify uncertain create/update handling in the same prompt-owned guidance: read back exact target, reconcile a confirmed effect without duplicate retry, retry only when absence is established, and stop with confirmed-versus-uncertain facts otherwise. Do not log credentials, full private artifacts, raw prompts, or large payloads.
- Keep this Story limited to Feature issue and BRD/UX/SDD artifacts; do not implement later Epic/Story hierarchy, plan/progress artifacts, Task handoff, PR lifecycle, or local-only mode.

## Files

- `templates/AGENTS.md`
- `templates/skills/business-requirements-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/software-design-writer/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-feature-readback.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-feature-readback.test.js`; pass: build and focused tests exit 0 for deterministic fake-MCP missing prerequisite, interrupted unpublished draft, selective BRD→UX→SDD reads, no artifact-cache write, timed-out create/update with confirmed readback, absent readback, and unresolved/conflicting readback; expected evidence: named passing scenario traces showing no downstream advance and no duplicate write when confirmation is missing. Static assertions and fake traces establish the guidance contract only.
- Guidance states what is confirmed separately from uncertain external effects and names the blocked action and next step. No publication checkpoint is claimed from a call response alone; missing or inconsistent authoritative content stops.
- `templates/manifest.json` includes any newly changed template versions and user-facing sync notes. Avoid full artifact or secret logging and unnecessary repeated reads; touched source-file size gate remains required in final validation.
