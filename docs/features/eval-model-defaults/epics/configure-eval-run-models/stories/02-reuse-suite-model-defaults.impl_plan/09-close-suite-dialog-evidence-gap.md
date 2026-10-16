# Step: Prove Suite models dialog recovery with fake-DOM interactions

## Goal

Close T06's bounded post-commit evidence gap for focus, saved-status confirmation, and user-controlled Start without changing saved-choice policy.

## Scope

- Task ID: EMD-S02-T11; Milestone ID: EMD-S02-M4; Status: done (commit eab4a51); Depends on: EMD-S02-T06; blocks EMD-S02-T07.
- Story acceptance criteria: AC-01, AC-02, AC-05; source decisions: BRD `REQ-01`, `REQ-05`, `REQ-06`, `AC-01`, `AC-05`, `AC-06`; UX Cancel/close and Save focus return, Save status, no automatic run; SDD explicit Save/no automatic restart. On-demand pointers: `ux.md` → Phone: persistent model dialogs, Interaction States and Recovery, Accessibility and Visual Direction; `sdd.md` → Run Evidence, Presentation, and Compatibility, Security, Failure, and Operational Behavior, Quality Strategy and Planned Verification. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Add direct deterministic fake-DOM assertions that focus returns to originating Suite Models trigger after Cancel/close and Save; saved-status node confirms success; neither path dispatches a run action. Assertions must fail if behavior is removed/redirected. If they expose bounded defect, repair only `workbench-ui` and retest. Do not amend or reuse T06 commit; T11 has one separate checked commit. No case overrides or browser work.

## Files

- `src/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.ts`
- `src/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.ts`
- Directly necessary `src/modules/local-evals-workbench/workbench-ui/` production files only if a failing assertion exposes a bounded defect.

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/workbench-ui/workspace-rendering.test.js bin/modules/local-evals-workbench/workbench-ui/workspace-setup-interactions.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: direct fake-DOM assertions for Cancel/close and Save focus return to origin Models trigger, saved-status node confirmation, and zero run action; removed/redirected behavior fails; touched source ≤500 lines.
- Record check, Done-item evidence and T11 commit in `progress.log`, closing T06 gap before T07. This proves deterministic UI contract, not visual fidelity or assistive-technology operation; later user QA owns those limits.
