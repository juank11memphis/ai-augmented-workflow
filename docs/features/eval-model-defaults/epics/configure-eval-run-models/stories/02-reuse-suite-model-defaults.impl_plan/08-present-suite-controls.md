# Step: Present suite defaults and the persistent Suite models dialog

## Goal

Show saved defaults at a glance and make Save, Reset, and Cancel explicit on the binding suite-level UI surfaces.

## Scope

- Task ID: EMD-S02-T06; Milestone ID: EMD-S02-M4 (binding workbench controls); Status: done (commit 86316f7; evidence gap closed by T11); Depends on: EMD-S02-T03, EMD-S02-T04.
- Story acceptance criteria: AC-01–AC-03, AC-05; source decisions: BRD `REQ-01`, `REQ-05`, `REQ-06`, `AC-01`, `AC-02`, `AC-05`, `AC-06`; UX suite summary, labeled Models action, Suite models dialog, Not set, unavailable choice, Save/Cancel/Reset focus/recovery, responsive phone/tablet/desktop goals. On-demand pointers: `ux.md` → Phone: suite defaults and full-suite run; Phone: persistent model dialogs; Phone: blocked choice and case-first result; Tablet: suite controls, selected case, and results; Desktop: suite controls and case-first results; Interaction States and Recovery; `sdd.md` → Run Evidence, Presentation, and Compatibility, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Local Evals Workbench presentation/view-model and client adapters consume server results, not raw suite files or local inheritance logic. Keep Start run primary; show tested default and applicable judge default or Not set. For deterministic-only suite omit judge row. The Suite models dialog uses explicit Save to call T03; Cancel/close performs no mutation and returns focus. Reset only clears the chosen role after Save.
- Do not expose Test-case models, override, or mixed-model controls before EMD-S03. Preserve S01 case-first result and evidence/repair navigation. Use deterministic Node markup and fake-interaction contract tests, not a browser.

## Files

- `src/modules/local-evals-workbench/workbench-ui/{workspace-view-model,workspace-layout,workspace-setup-client,workspace-setup-recovery}.ts`
- `src/modules/local-evals-workbench/workbench-ui/` cohesive suite-dialog/view modules and contract tests as needed.
- `src/modules/local-evals-workbench/workbench-ui/{workspace-rendering,workspace-setup-interactions}.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: deterministic markup/interaction assertions for suite summary, applicable judge omission, labeled Models action, Suite models fields, Save-only mutation, independent reset, Cancel unchanged, unavailable visible, focus/status recovery intended but not directly asserted in observed T06 check (T11 closes this gap), plus the size-checker's count and ≤500-line result for this Task's uncommitted source changes.
- Observed focused UI check passed 15/15 and size gate passed, but direct focus return, Save status, and no auto-run assertions were absent; status remains evidence-gap until T11. Evidence otherwise answers the SDD UI contract/regression method for REQ-01/05/06 and binding UX states. Mark visual fidelity, keyboard/screen-reader usability, and phone/tablet/desktop rendering as later user QA, not automated proof.
