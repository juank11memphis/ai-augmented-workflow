# Step: Define headless eval contracts and read handlers

## Goal

Expose transport-neutral discovery, scope-aware runtime description, and bounded result operations through the Local Evals Workbench public boundary before adding infrastructure or CLI wiring.

## Scope

- Task ID: AGE-US-01-T01; Milestone ID: AGE-US-01-M01; Status: done; Depends on: none.
- Story plan: `AGE-US-01`, `docs/features/agent-guided-evals/epics/conversational-eval-loop/stories/01-run-and-inspect-evals-without-ui.md`. Sources: `docs/features/agent-guided-evals/epics/conversational-eval-loop/epic_brief.md`; `docs/features/agent-guided-evals/brd.md` (`REQ-01`, `REQ-02`, `REQ-09`, `REQ-10`, `AC-01`, `AC-06`, `AC-07`); `docs/features/agent-guided-evals/sdd.md`; `docs/architecture.md` (Local Evals Workbench and operation contract). Selected architecture: `.agents/skills/command-pattern/SKILL.md`. Flags: none (Epic and Story).
- Milestones: M01 = public read contracts and bounded evidence, T01, evidence fake-port read tests; M02 = awaited persisted headless execution, T02–T03, evidence fake-port and disposable-runner tests; M03 = thin CLI and installed-package parity, T04–T05, evidence CLI/fixture regression and packed smoke. AC map: AC-01 → T01/T04/M01+M03; AC-02 → T02/T03/T04/T05/M02+M03; AC-03 → T01/T04/T05/M01+M03; AC-04 → T02/T03/T04/T05/M02+M03.
- Task/status list: T01 pending; T02 pending; T03 pending; T04 pending; T05 pending. Durable conventions: one checked Task per file, execute in filename order; record each actual check and each `Done when` item, not just a passing test; no production or test changes during planning. Append execution entries to story-local `progress.log` as `Task ID | outcome | actual check/result | Done-when evidence | commit reference or none | blocker or none | gotchas`; no execution or commit is claimed by this plan. Plan review and human decision remain preparatory; later execution controls govern branches, commits, and PRs.
- Story acceptance criteria: AC-01, AC-03, AC-04; source decisions: SDD `suites`, `describe`, and `result` JSON contracts; compatible models and judge need are scope-aware; selected failure only; typed blocked/unavailable, not false pass; no browser/HTTP; on-demand pointers: `docs/features/agent-guided-evals/sdd.md` §§ Architecture and responsibilities, Command contracts and boundaries, Safety, state, and failure behavior, Quality strategy and planned verification; `docs/features/agent-guided-evals/brd.md` §§ Requirements, Business Acceptance Criteria; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning area: `src/modules/local-evals-workbench/`. Reuse the existing discovery Command/Handler/Result and extend its public tests rather than duplicating it. Extend runtime-description's Command/Handler/Result for scope-aware judge need. Define immutable Command, explicit Result, slice-owned Ports and focused Handler for bounded headless result retrieval. Use module-owned public composition/adapters; do not import another slice's internals or expose internal suite definitions.
- Make `describe` compute judge requirement from the selected case or whole suite, while retaining the existing runtime compatibility checks. Make `result` return a concise summary or exactly one selected failed assertion's capped output, reference/expected context, diagnostics, and artifact references. Missing, corrupt, unsafe, or non-failed selection is blocked/unavailable; never return the whole attempt trace as the ordinary response. No mutation operation is added.
- Keep the existing browser workbench and its result reader unchanged unless a narrow shared public boundary is necessary. If an existing near-limit file must be touched, split cohesive responsibilities before the 500-line gate; `start-local-evals-workbench/local-server-starter.ts` is already 470 lines and should not receive CLI logic.

## Files

- `src/modules/local-evals-workbench/headless-eval-result/{command,result,ports,handler,index}.ts` and `handler.test.ts`.
- `src/modules/local-evals-workbench/discover-conventional-eval-suites/handler.test.ts` for public discovery contract regression.
- `src/modules/local-evals-workbench/describe-eval-suite-runtime/{handler,result,handler.test}.ts` if scope-aware description is extended at its public boundary.
- `src/modules/local-evals-workbench/get-eval-run/{handler,result,handler.test}.ts` and `src/modules/local-evals-workbench/repair-context/selected-evidence.ts` as reference contracts, not permission to expose raw attempt content.
- `src/modules/local-evals-workbench/index.ts` for public exports.

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/local-evals-workbench/discover-conventional-eval-suites/handler.test.js bin/modules/local-evals-workbench/describe-eval-suite-runtime/handler.test.js bin/modules/local-evals-workbench/headless-eval-result/handler.test.js`; pass: build succeeds and fake-port tests cover valid/invalid suite and case discovery, selected versus all judge need, runtime unavailability, summary, one-failure cap, unsafe/missing artifact and non-failed assertion; expected evidence: named test cases and bounded JSON assertions, including no full-run output.
- Read handlers depend on Ports and return typed Results without CLI, HTTP, filesystem, process, or provider imports; public discovery does not leak internal definitions. This is deterministic unit evidence for SDD Quality strategy and `REQ-01/02/09/10`; it does not prove an agent's later interpretation.
- No headless mutation command or project-file edit path exists; the only evidence output is selected, capped content plus safe references. Preserve existing read semantics where they are already safe.
