# Step: Prove HTTP preview leaves saved case choices unchanged

## Goal

Close the post-commit T06 evidence gap by proving that the existing preview operation reads effective case choices without changing the project-owned suite definition.

## Scope

- Task ID: EMD-S03-T06A; Milestone ID: EMD-S03-M3 (surface parity); Status: done; Depends on: EMD-S03-T03, EMD-S03-T06.
- Story acceptance criteria: AC-01, AC-03, AC-05. Source decisions: `brd.md` REQ-02/03/05/06, AC-03/05/06; `sdd.md` preview and start share the resolver, but only an explicit Save may edit the suite file; `ux.md` keeps run-only choice distinct from persistent Models dialogs. On-demand pointers: `sdd.md` → Responsibilities and Contracts, Main Flow and Runner Coordination, Security, Failure, and Operational Behavior, Quality Strategy and Planned Verification; `ux.md` → Phone-First User Flow, Interaction States and Recovery. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md` only if operational code changes.
- Owning area: Local Evals Workbench preview HTTP adapter and shared run-selection operation. Extend its existing disposable-project/offline-runner integration fixture with a saved case tested-model override and a second inheriting case. Capture exact suite-file bytes before each HTTP `POST /api/eval-runs/preview`; assert they are identical afterward for a ready full-suite preview, a ready one-case `runOnly` preview, and a blocked preview caused by an unavailable saved case override. Assert the ready case selections reflect override versus inheritance and the blocked result names the case, role, and source. Reuse the existing runner that accepts describe only, so no paid execution is possible.
- Continuation guidance from the failed focused test: retain the original one-case fixture and expected case ID in `preview retains observed runner boundary categories`; keep the new two-case override/inheritance fixture isolated to the HTTP byte-preservation scenarios, or otherwise preserve that boundary assertion's original observed ID without weakening its category assertion. Then rerun the unchanged Task check and capture its prescribed evidence.
- This is a follow-up evidence Task, not an amendment of T06's checked commit or a new CLI capability. Do not add a CLI preview command, change the save contract, or run a live model, browser, or visual automation.

## Files

- `src/modules/local-evals-workbench/preview-eval-run/preview-integration.test.ts`
- Existing disposable-project fixture in that test file, adjusted only if needed to keep the check focused.

## Done when

- Task check: after `pnpm run build`, `node --test bin/modules/local-evals-workbench/preview-eval-run/preview-integration.test.js`; pass: zero failed tests; expected evidence: the HTTP preview responses contain the ordered inherited/overridden per-case model selections and the precise unavailable-override block, while byte-for-byte suite contents remain unchanged before/after each normal, run-only, and blocked preview. This is SDD runner/artifact-fixture and regression evidence for BRD REQ-02/03/05/06 and Story AC-01/03/05; a changed byte or unexpected preview outcome fails the test.
- Record `node .agents/scripts/check-touched-source-file-lines.mjs` pass/fail before the scoped Task commit; the touched TypeScript test remains ≤500 lines. Preserve T06 commit `d94f93c` and its recorded checks without reinterpreting CLI describe as preview.
- Static HTTP/fixture tests do not establish live-agent adherence or visual/accessibility fidelity; those remain the Story's explicit exclusions and later user QA.
