# Step: Prove the incident matrix and complete runner guidance

## Goal

Use disposable fake runners to prove the two-role evidence path and representative incomplete-run outcomes, then document the external runner obligation.

## Scope

- Task ID: IERE-S03-T04; Milestone ID: IERE-S03-M02 (inspectable incident evidence); Status: completed; Depends on: IERE-S03-T03.
- Story acceptance criteria: AC-01–AC-04; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01–REQ-08 and AC-01–AC-05; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Main flow and failure branches (sequence diagram), Project-runner contract and GeniusCR dependency, Quality strategy — planned, not yet run; `templates/skills/eval-authoring/references/version-2-contract.md` § version-3 runner events; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`.
- Owner: Local Evals Workbench disposable fake-runner acceptance and managed runner guidance. Add deterministic focused `approximate-price` and 17-case full-run fixtures; full run must report 2 completed, 1 incomplete, 14 not run. Matrix covers assertion, tested-provider and judge non-success/no-response, adapter failure, malformed model/judge output, judge grading error before normal completion, runner/protocol rejection, runner-reported error, unexpected exit, timeout, missing/not-emitted/not-persisted response, and limit truncation. Assert origin/stage and evidence-source attribution only to observed facts; no fabricated failed assertion or completed judgment. Focused case must expose source locator only when emitted and persisted, otherwise the specific gap.
- Update `templates/skills/eval-authoring/references/version-2-contract.md` with concise runnable v3 judge event example and role/check identity, explicit both-role observation/gap obligations, non-success and before-grading-error order, and distinctions among no response, not emitted, rejected/not persisted where known. Update `templates/manifest.json` global and entry versions with current user-facing sync note; do not overwrite the installed `.agents` copy or edit GeniusCR. Document local-inspection limits in `README.md` only if its current user-facing result guidance would otherwise misdescribe judge bytes. No broader eval-authoring changes.

## Files

- `src/modules/local-evals-workbench/run-history/judge-response-cli-acceptance.test.ts` (new)
- `src/modules/local-evals-workbench/run-history/provider-response-cli-acceptance.test.ts`
- `src/modules/local-evals-workbench/run-history/incomplete-attempt-cli-acceptance.test.ts`
- `templates/skills/eval-authoring/references/version-2-contract.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-eval-authoring-contract.test.ts` (only if needed to assert the revised packaged guidance)
- `README.md` (only if needed for accurate user-facing selected result guidance)

## Done when

- Task check: `pnpm build`; pass: disposable fixtures and compiled CLI tests build; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/run-history/judge-response-cli-acceptance.test.js bin/modules/local-evals-workbench/run-history/provider-response-cli-acceptance.test.js bin/modules/local-evals-workbench/run-history/incomplete-attempt-cli-acceptance.test.js bin/entrypoints/cli/evals-json.test.js bin/modules/template-catalog/templates-eval-authoring-contract.test.js`; pass: named acceptance and static-contract cases assert focused and full counts, each matrix origin/gap, exact selected response bytes and locator conditions, v1/v2 regression, bounded JSON, synthetic-body sentinel absent from unselected/overview JSON, stderr and routine logs, and packaged guidance for both roles; expected evidence: passing test names plus observed CLI JSON/field-range and packaged-contract assertions.
- Managed runner guidance and fixture agree on both roles and the failure-before-completion sequence. The template manifest has coordinated version bumps and a user-facing sync note. Human PR review can assess implementability and uncertainty; tests prove Sibu fake-runner handling, not real provider/GeniusCR behavior.
- Evidence class: disposable acceptance/integration, edge/failure matrix, regression and distribution contract. No live model, separate QA, dashboard, GeniusCR edit, fuzz, or mutation; residual risk is project-runner compliance and interpretation of ambiguous cause.
