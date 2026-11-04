# Step: Remove brittle version and sync-note test cases

## Goal

Restore focused validation by deleting only the two exact test cases that pin outdated absolute versions or sync-note wording, while preserving all remaining behavioral coverage.

## Scope

- Task ID: GFW-S03-T05; Milestone ID: GFW-S03-M05; Status: done; Depends on: GFW-S03-T04
- Story acceptance criteria: AC-02, AC-03, AC-04 (retained behavioral tests continue to cover matching progress, draft-PR handoff, and truthful status); source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-04, REQ-05, REQ-08, AC-03, AC-05; `docs/features/github-feature-work-tracking/sdd.md` §§ Publish a checked Task handoff, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence require honest partial-publication behavior and deterministic contract evidence; the explicit human decision authorizes removing only the two brittle cases named below; on-demand pointers: those SDD sections and `docs/features/github-feature-work-tracking/ux.md` § Resume and hand off Story work; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`
- Owning area: the two existing template-catalog TypeScript test files only. Remove only the case `ships a bumped template version with current user-facing sync notes` from `src/modules/template-catalog/templates-checked-task-handoff-guidance.test.ts` and the case `ships current gatekeeper version and user-facing Epic handoff note` from `src/modules/template-catalog/templates-story-pr.test.ts`.
- Do not delete either test file, add replacement exact version/note pins, or modify other test cases, templates, production code, manifests, or lifecycle assertions. Preserve behavioral assertions for PR authority, handoff order, safe stops, manifest/sync lifecycle, and all other existing cases.
- This is the bounded human-decided recovery for the reported final-validation failures; do not infer broader test-maintenance scope or attribute the unresolved baseline case beyond this authorized removal.

## Files

- `src/modules/template-catalog/templates-checked-task-handoff-guidance.test.ts`
- `src/modules/template-catalog/templates-story-pr.test.ts`

## Done when

- Prerequisite build: `pnpm build` passes so the focused compiled TypeScript tests reflect the edited sources.
- Task check: `node --test bin/modules/template-catalog/templates-checked-task-handoff-guidance.test.js bin/modules/template-catalog/templates-story-pr.test.js`; pass: all 10 remaining test cases pass; expected evidence: named 10/10 passing compiled tests, with exactly the two authorized case blocks absent and no test-file or other-case deletion.
- The remaining tests continue to assert behavioral handoff and Story PR contracts, including authority, ordering, safe-stop behavior, and lifecycle expectations; no replacement absolute version or literal sync-note assertion is introduced.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for both touched TypeScript test files (clean-code 500-line source-size gate); expected evidence: source-size check reports both touched files at or below 500 lines.
- Focused deterministic tests provide regression evidence only; they do not prove live agent behavior or GitHub semantics. Final Story validation remains `pnpm verify`, `node .agents/scripts/check-touched-source-file-lines.mjs`, and `pnpm run validate:packed-runtime` after changes stabilize, without running them as part of this Task plan.
