# Step: Repair saved-default preview and headless fixtures

## Goal

Make integration fixtures represent explicit suite defaults while retaining separate tests for missing defaults and one-case temporary choices.

## Scope

- Task ID: EMD-S02-T15; Milestone ID: EMD-S02-M5; Status: done; Depends on: EMD-S02-T14; blocks EMD-S02-T08.
- Story acceptance criteria: AC-01–AC-04, AC-05; source decisions: BRD `REQ-01`, `REQ-03`–`REQ-06`, `AC-01`, `AC-04`, `AC-05`; SDD Project-Owned Suite Format, Main Flow, Quality Strategy. On-demand pointers: `src/modules/local-evals-workbench/headless-composition.test.ts` → run outcomes; `src/modules/local-evals-workbench/preview-eval-run/preview-integration.test.ts` → HTTP/runner boundary. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Local Evals Workbench fixture/test ownership: use saved tested defaults for intended ready full-suite cases; remove legacy full-suite run-only `model` inputs; explicitly cover old suites with no default as blocked, unavailable saved choices, and one-case run-only compatibility without persistence. Assert the precise typed outcome for each tested branch: a missing suite default is `missing-suite-default`; an unavailable saved choice is `saved-model-unavailable` (preview stage `description` after runner description); an unavailable single-case temporary choice is `run-only-model-unavailable` with affected case and role. Correct assertions where typed blocked results now include affected `caseId`; preserve environment and runner-boundary failure categories by satisfying selection preconditions first. These are contract-alignment assertions, not permission to change resolver or preview semantics. Do not make production resolver accept full-suite temporary input or touch T08 paths.

## Files

- `src/modules/local-evals-workbench/headless-composition.test.ts`
- `src/modules/local-evals-workbench/preview-eval-run/preview-integration.test.ts`

## Done when

- Task check: `pnpm build`, then `node --test bin/modules/local-evals-workbench/headless-composition.test.js bin/modules/local-evals-workbench/preview-eval-run/preview-integration.test.js`, then `node .agents/scripts/check-touched-source-file-lines.mjs` before commit; pass: all exit zero; expected evidence: saved-default ready preview/run, old-suite missing-default stop, one-case run-only non-persistence, case-specific blocked result, and runner/environment error tests reach their intended boundary with ≤500-line touched files.
- Deterministic disposable fixture and HTTP/fake-runner evidence covers selection and edge/failure behavior; it does not claim paid execution or UI visual fidelity. Flags: none.
