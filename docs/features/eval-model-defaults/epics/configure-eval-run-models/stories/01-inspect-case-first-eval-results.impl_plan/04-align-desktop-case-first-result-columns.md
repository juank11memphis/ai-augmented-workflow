# Step: Align desktop case-first result columns

## Goal

Remove or replace remaining legacy result-grid placements across tablet and desktop width rules so the desktop case-first header and rows align to the UX's five columns without altering the phone cards or tablet list.

## Scope

- Task ID: EMD-S01-T04; Milestone ID: EMD-S01-M02 (inspectable case-first workbench); Status: done; Depends on: EMD-S01-T03.
- Story acceptance criteria: AC-04; business source `docs/features/eval-model-defaults/brd.md` REQ-06 and AC-06; source decisions: `sdd.md` **Run Evidence, Presentation, and Compatibility** requires case-first results without a model-column matrix; `sdd.md` **Quality Strategy and Planned Verification** excludes UI tests, automated UI/accessibility review, and agent visual review, leaving mockup comparison to the user. On-demand pointers: `docs/features/eval-model-defaults/ux.md` **Desktop: suite controls and case-first results**, **Tablet: suite controls, selected case, and results**, **Accessibility and Visual Direction**; `docs/features/eval-model-defaults/sdd.md` **Run Evidence, Presentation, and Compatibility**, **Quality Strategy and Planned Verification**. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Owning module: Local Evals Workbench, active result presentation styles only. Reconcile the remaining legacy `min-width:700px` result-header and result-row child grid placements with the active case-first rules across tablet and desktop breakpoints; do not merely remove one selector if other stale placements still interfere. Preserve the one-column phone card behavior, tablet case-first list, and desktop case-first row presentation; no redesign.
- This is bounded post-commit evidence-gap recovery after T03 commit `752562a`. Preserve T01/T02/T03 step files, statuses, evidence, commits, and progress entries. No automated UI/DOM/accessibility/visual tests or agent visual review; user-owned phone/tablet/desktop visual and accessibility QA remains pending.
- No feature flag is declared (**Flags: none**). Do not change result behavior, markup, model data, or interaction paths.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-styles.ts`

## Done when

- Task check: `pnpm run build`; pass: exits 0; expected evidence: successful build output for the stylesheet source.
- Task check: `pnpm run validate:packed-runtime`; run after the build and after all CSS changes stabilize; pass: exits 0; expected evidence: packaged-runtime validation output confirming the shipped stylesheet asset remains valid.
- Task check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: exits 0 and the touched source file is at or below 500 lines; expected evidence: source-size gate output.
- Static CSS evidence records the desktop result header and row selectors, breakpoint rule order, and absence of stale grid placements that offset the header or row fields. The five desktop columns align in UX order: Case, Status, Model, Judge, Action; in particular, no obsolete first-header/name/status column placement shifts later fields to another row. Tablet case-first placement and the phone card rules remain intact. Do not create automated DOM/UI assertions.
- These source/build/packaged checks do not prove visual or accessibility fidelity. AC-04 / BRD REQ-06 and AC-06 remain subject to user-owned comparison with the binding phone, tablet, and desktop UX mockups, including readable labels, accessible interactions, and no phone horizontal scrolling. This QA remains pending and must not be reported as performed by the Task.
