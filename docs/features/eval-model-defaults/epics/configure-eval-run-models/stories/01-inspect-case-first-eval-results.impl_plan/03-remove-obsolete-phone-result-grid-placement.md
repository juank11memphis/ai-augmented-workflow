# Step: Remove obsolete phone result-grid placement

## Goal

Remove the legacy phone-only grid-column placements for case name and status that conflict with the active one-column case-first result button, while preserving the existing phone, tablet, and desktop case-first presentation.

## Scope

- Task ID: EMD-S01-T03; Milestone ID: EMD-S01-M02 (inspectable case-first workbench); Status: done; Depends on: EMD-S01-T02.
- Story acceptance criteria: AC-04; business source `docs/features/eval-model-defaults/brd.md` REQ-06 and AC-06; source decisions: `sdd.md` **Run Evidence, Presentation, and Compatibility** requires case-first results; `sdd.md` **Quality Strategy and Planned Verification** excludes UI tests, automated UI/accessibility review, and agent visual review, leaving mockup comparison to the user. On-demand pointers: `docs/features/eval-model-defaults/ux.md` **Phone: blocked choice and case-first result**, **Tablet: suite controls, selected case, and results**, **Desktop: suite controls and case-first results**, **Accessibility and Visual Direction**; `docs/features/eval-model-defaults/sdd.md` **Run Evidence, Presentation, and Compatibility**, **Quality Strategy and Planned Verification**. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Owning module: Local Evals Workbench, active result presentation styles only. Remove or replace the obsolete `max-width:699px` `.result-name` and `.result-status` grid-column declarations so they cannot create an implicit second column against the later one-column `.result-list button` rule; retain the active phone card layout and the tablet/desktop case-first rules.
- This is bounded post-commit evidence-gap recovery for the accepted plan v1: T01 and T02 are already done; T02 commit `d9ebcac` is preserved. Do not rewrite prior Task outcomes, statuses, commits, or progress entries. No automated UI/DOM/accessibility/visual tests or agent visual review; user-owned phone/tablet/desktop visual and accessibility QA remains pending.
- No feature flag is declared (**Flags: none**). Do not add behavior or redesign the result presentation.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-styles.ts`

## Done when

- Task check: `pnpm run build`; pass: exits 0; expected evidence: successful build output for the stylesheet source.
- Task check: `pnpm run validate:packed-runtime`; run after the build; pass: exits 0; expected evidence: packaged-runtime validation output confirming the shipped stylesheet asset remains valid after the change. T02's earlier packed-runtime result predates this stylesheet correction and is not evidence for T03.
- Task check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: exits 0 and the touched source file is at or below 500 lines; expected evidence: source-size gate output.
- Static CSS evidence records inspection of the `max-width:699px` result rules and confirms there is no conflicting `grid-column` placement for `.result-name` or `.result-status` at phone width; tablet and desktop case-first placements remain scoped to their existing wider breakpoints. Do not create an automated DOM/UI assertion for this.
- Existing active phone result cards remain one-column without an implicit second column; tablet case-first list and desktop case-first rows remain intact. Build/source inspection are not visual or accessibility proof.
- AC-04 / BRD REQ-06 and AC-06 remain subject to user-owned comparison with the binding phone, tablet, and desktop UX mockups, including readable labels, accessible interactions, and no phone horizontal scrolling. This QA remains pending and must not be reported as performed by the Task.
