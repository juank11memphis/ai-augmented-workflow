# Step: Present and edit case overrides in the Workbench

## Goal

Expose the binding selected-case Models action, independent Test-case models dialog, blocked recovery, preview, and truthful case-first labels without duplicating selection rules in the browser.

## Scope

- Task ID: EMD-S03-T05; Milestone ID: EMD-S03-M3 (surface parity); Status: done; Depends on: EMD-S03-T02, EMD-S03-T03, EMD-S03-T04.
- Story acceptance criteria: AC-01, AC-03, AC-04, AC-05. Source decisions: `brd.md` REQ-02/05/06, AC-03/05/06; `sdd.md` thin UI adapter over shared operations and actual per-case result read; binding `ux.md` selected-case context, Test-case models dialog, blocked choice, case-first results, phone/tablet/desktop and interaction states. On-demand pointers: `ux.md` → Phone: selected case and temporary choice, Phone: persistent model dialogs, Phone: blocked choice and case-first result, Tablet: suite controls, selected case, and results, Desktop: suite controls and case-first results, Interaction States and Recovery; `sdd.md` → Run Evidence, Presentation, and Compatibility, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning area: Local Evals Workbench UI driving adapter. Show selected case only (no always-visible case list), each role's effective label and Inherited/Override source, labeled Models action, and contextual dialog with independent Inherit/Override and Reset override. GET the saved snapshot/token and POST only explicit Save through the same change-choice command; Cancel/close never mutates; conflict keeps dialog open; Save returns focus, updates summary, and never auto-starts. Preserve suite default as required.
- On Start block, open the affected Test-case models dialog with role-specific unavailable text and explicit Replace or Inherit; if inheritance is also unavailable, resolve suite choice separately. Use shared resolver outcomes, not browser-computed fallbacks. Preview and case-first rows show actual ordered case pairs, optional Judge only when used, no call-count or price estimates, and preserve failure detail/repair navigation. Match binding phone/tablet/desktop structure; later user QA owns visual/accessibility judgment.
- Keep browser script pieces cohesive; if a touched source file approaches or exceeds 500 lines, split by UI responsibility before size check. Do not add headless browser tests or automated visual review.

## Files

- `src/modules/local-evals-workbench/workbench-ui/{workspace-suite-models-client,workspace-setup-client,workspace-case-detail,workspace-run-preview-client,workspace-result-data,workspace-layout,workspace-styles}.ts`
- A cohesive case-model client fragment and UI composition file if needed.
- `src/modules/local-evals-workbench/workbench-ui/{workspace-case-interactions,workspace-setup-recovery,workspace-preview-outcomes,workspace-rendering,workspace-results-client-read}.test.ts`

## Done when

- Task check: after `pnpm run build`, `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-case-interactions.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-recovery.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-preview-outcomes.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-results-client-read.test.js`; pass: zero failed tests; expected evidence: deterministic markup/fake-interaction contracts cover selected-case summaries and action, independent dialog save/reset/cancel/conflict and focus, unavailable override Replace/Inherit block without paid start, ordered preview and actual model labels/repair link, and no estimates or extra case list. This is SDD deterministic UI contract/regression evidence for REQ-02/05/06 and Story AC-01/03/04/05.
- Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before commit. User-owned phone/tablet/desktop fidelity, keyboard and screen-reader QA remains unverified by this Task; no automated visual/accessibility or headless-browser claim.
