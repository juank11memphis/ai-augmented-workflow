# Step: Present one-case temporary choices and blocked-run recovery

## Goal

Keep temporary choices visibly separate from saved defaults, show model labels without estimates, and guide missing/unavailable runs to an explicit Suite models decision.

## Scope

- Task ID: EMD-S02-T07; Milestone ID: EMD-S02-M4; Status: done; Depends on: EMD-S02-T06, EMD-S02-T11, EMD-S02-T04, EMD-S02-T10, EMD-S02-T12.
- Story acceptance criteria: AC-02–AC-05; source decisions: BRD `REQ-04`–`REQ-06`, `AC-04`–`AC-06`; SDD preview presents ordered per-case choices without call-count/price estimates and model-choice controls show labels without price estimates; UX single-case Use saved models/This run only, applicable Judge model, blocked Start opens Suite models with affected choice, Save returns to controls without auto-start, full-suite offers no run-only input. On-demand pointers: `ux.md` → Information Architecture and Content Rules; Phone: selected case and temporary choice; Phone: blocked choice and case-first result; Tablet: suite controls, selected case, and results; Desktop: suite controls and case-first results; Interaction States and Recovery; `sdd.md` → Main Flow and Runner Coordination, Run Evidence, Presentation, and Compatibility, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench UI state/client adapters send one-case temporary choice only on preview/start; changing run scope back to all clears/hides it. Blocked Start opens the suite dialog focused on missing/unavailable role, leaves run unstarted, and requires another Start after explicit Save. Preserve case-first result rows and actual model labels from run evidence.
- In model-choice controls, remove rendering of `priceEstimate` from both the initial workbench shell and client-refreshed model options; retain model names, family grouping, selected values, and choice behavior. The ordered per-case preview must not add expected-call counts, prices, or cost estimates. Add deterministic Node markup and fake-interaction assertions using fixture model options that contain conspicuous price-estimate text: rendered option labels and refreshed controls show only model names, preview shows ordered per-case model names but no estimate text or estimate row. Scope absence assertions to preview/choice UI, not actual post-run cost evidence or inert bootstrap JSON.
- No headless browser, visual automation, agent visual review, or case-override controls. User-owned later QA compares the binding phone/tablet/desktop mockups and accessibility behavior.

## Files

- `src/modules/local-evals-workbench/workbench-ui/{browser-state,run-preview-state,workspace-setup-client,workspace-run-start-client,workspace-setup-recovery}.ts`
- `src/modules/local-evals-workbench/workbench-ui/{preview-acceptance,run-execution-acceptance,workspace-setup-recovery,browser-state}.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/{render-workbench-shell,workbench-client-rendering}.ts`
- `src/modules/local-evals-workbench/workbench-ui/{render-workbench-shell,workspace-rendering}.test.ts`
- A cohesive new temporary-choice state module/test in the same owning area if needed.

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/preview-acceptance.test.js bin/modules/local-evals-workbench/workbench-ui/run-execution-acceptance.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-recovery.test.js bin/modules/local-evals-workbench/workbench-ui/render-workbench-shell.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: fake-interaction preview/start parity, one-case temporary tested/judge controls, no persistence, full-suite exclusion, dialog opened on missing/unavailable role, no auto-start after Save/Cancel, actual case result label unaffected by later default changes, initial and refreshed model-choice labels retain names/selection but omit fixture prices, and ordered per-case preview shows model names without call-count/price/cost estimate markup, plus the size-checker's count and ≤500-line result for this Task's uncommitted source changes.
- Evidence answers SDD UI contract and preview/start regression methods for REQ-04–06 and the SDD Quality Strategy's no-estimate markup check. User QA still owns visual, responsive, and assistive-technology judgment; actual post-run cost evidence remains unchanged.
