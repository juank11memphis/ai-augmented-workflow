# Step: Prove temporary-choice rendering and blocked-dialog focus

## Goal

Close T07's bounded post-commit evidence gap with deterministic UI contract assertions, without changing the accepted run-selection or interaction behavior.

## Scope

- Task ID: EMD-S02-T13; Milestone ID: EMD-S02-M4 (binding workbench controls); Status: done (7d0492f); Depends on: EMD-S02-T07; blocks EMD-S02-T08.
- Story acceptance criteria: AC-04–AC-05; source decisions: BRD `REQ-04`–`REQ-06`, `AC-04`–`AC-06`; SDD single-case run-only choice and blocked-choice UI contract; UX temporary controls appear only for one-case scope and blocked Start opens Suite models with the affected role focused. On-demand pointers: `sdd.md` → Run Evidence, Presentation, and Compatibility; Quality Strategy and Planned Verification; `ux.md` → Phone: selected case and temporary choice; Phone: blocked choice and case-first result; Interaction States and Recovery. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Keep changes in the existing Local Evals Workbench UI contract and interaction area. Add deterministic markup assertions that tested-model and applicable Judge temporary-choice controls render for one-case scope and are absent for full-suite scope. Add fake-interaction assertions executing the real `openSuiteModels` UI path after blocked Start: verify focus first targets the affected role's choice (not merely that the role is passed to a stub), then verify both Save and Cancel return focus to Start run and do not start a run. Assertions must fail if presentation, focus targeting, or either recovery outcome is removed or redirected. If they expose a bounded defect, repair only the owning `workbench-ui` surface. Do not alter run-selection policy, saved defaults, preview/start payloads, user-facing flow, or EMD-S03 case overrides.
- Continuation from the preserved uncommitted edit: first diagnose the fake-VM boundary in `preview-acceptance.test.ts` before changing UI behavior or weakening assertions. The harness currently declares outer `let focused`, while the VM callback writes the context's separate `focused` property; route focus observations through one shared mutable `browserState` (or equivalent shared object) and assert the VM's actual value. Separately trace why the shared `browserState.dialog` remains empty after `startRun()`; establish whether blocked Start reaches the real `openSuiteModels`/`openSheet` path and ensure the fake captures the same state object the VM callback mutates. Make the smallest harness correction supported by that observation, then rerun the unchanged prescribed Task check. Do not replace the real path with a stub or infer success from merely passing the affected role. If the trace instead proves a bounded production UI defect, limit any correction to the already listed owning UI surface; stop for the main agent if the cause crosses that boundary or needs a material decision.
- This is deterministic Node markup/fake-interaction evidence only; it does not claim browser rendering, visual fidelity, or assistive-technology behavior. User-owned responsive/accessibility QA remains required.

## Files

- `src/modules/local-evals-workbench/workbench-ui/preview-acceptance.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-setup-recovery.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-setup-recovery.ts` only if the real dialog path needs a bounded correction for focus on the affected role.
- Directly necessary markup source/test in `src/modules/local-evals-workbench/workbench-ui/` only if the assertions expose a bounded defect.

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/preview-acceptance.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-recovery.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all commands exit zero; expected evidence: deterministic markup assertions prove temporary tested/Judge controls are present for one-case scope and absent for full-suite UI, and fake-interaction assertions execute real `openSuiteModels` after blocked Start, observe focus on the affected role choice, then prove Save and Cancel each return focus to Start run without starting a run; touched source files are ≤500 lines.
- These assertions close only the T07 missing outcome evidence. SDD's planned deterministic Node markup/fake-interaction method remains unchanged; no new method, browser test, or automated visual/accessibility review is introduced. Record assertion-level evidence and this Task's single scoped commit in append-only `progress.log`; preserve T07's completed commit and evidence.
