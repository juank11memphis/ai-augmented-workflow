# Step: Verify handoff messages and template distribution

## Goal

Make confirmed and partial checked-Task messages match the binding UX hierarchy and verify that changed guidance distributes safely through Sibu templates.

## Scope

- Task ID: GFW-S03-T03; Milestone ID: GFW-S03-M03; Status: done; Depends on: GFW-S03-T02
- Story acceptance criteria: AC-02, AC-03, AC-04; source decisions: `brd.md` REQ-04/REQ-05/REQ-08 and AC-03/AC-05; `sdd.md` §§ Ownership and Boundaries, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence; `ux.md` binding compact checked Task handoff plus medium and wide resume mockups; on-demand pointers: `docs/features/github-feature-work-tracking/ux.md` §§ Binding Mockups, Terminal-Width Strategy, Interaction States and Feedback; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`
- Owning area: prompt-owned status guidance and template-catalog output/lifecycle tests. Show current state → next action → consequence → optional detail; compact success uses the checked/pushed/progress hierarchy, confirmed Story link, and confirmed draft PR link only when present. Medium/wide routine continuation adds orientation, not a decision. Partial publication names only verified effects, omits unconfirmed PR links/success heading, and pauses.
- Add deterministic width/output assertions at approximately 40, 80, and 120 columns, including first-Task draft PR, later Task reuse, and push/issue/PR partial states. Align only affected guidance; do not redesign the binding mockups or add a dashboard.
- Use fake init/doctor/sync lifecycle tests to verify manifest versions/notes, managed update delivery, customized-file protection, and local maintenance with no GitHub dependency. No separate human QA gate.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-checked-task-handoff-output.test.ts` (new)
- `src/modules/template-catalog/templates-checked-task-handoff-lifecycle.test.ts` (new)

## Done when

- Prerequisite build: `pnpm build` passes after the focused TypeScript tests are added.
- Task check: `node --test bin/modules/template-catalog/templates-checked-task-handoff-output.test.js bin/modules/template-catalog/templates-checked-task-handoff-lifecycle.test.js`; pass: compact/medium/wide and partial-state assertions plus fake init/doctor/sync scenarios all pass; expected evidence: named passing output and lifecycle cases, manifest-version/note comparisons, and preserved customized content.
- Confirmed output follows the UX mockups and routine later-Task continuation has no prompt; uncertain push, issue update, or first-Task PR never appears as a completed handoff. The PR link is shown only after confirmed open.
- Final Story validation after changes stabilize: run `pnpm verify` once (canonical build plus complete compiled deterministic suite), `node .agents/scripts/check-touched-source-file-lines.mjs` for touched-source size evidence, and `pnpm run validate:packed-runtime` once because changed templates affect installed package behavior beyond the aggregate suite; do not duplicate standalone build/test responsibilities already covered. Preserve actual pass/fail results and every Task's `Done when` evidence for the Story PR. The packed-runtime command uses isolated local fixture installation, not live GitHub or a disposable repository integration run. No live GitHub/model, manual two-engineer rehearsal, or separate QA gate; final Epic PR human review compares affected terminal states with UX, because assertions cannot prove subjective visual fidelity or agent compliance. Deeper fuzz/mutation checks are skipped: bounded prompt/fake-host states and deterministic edge/failure coverage answer this Story's specified risk; live remote semantics remain a residual risk.
