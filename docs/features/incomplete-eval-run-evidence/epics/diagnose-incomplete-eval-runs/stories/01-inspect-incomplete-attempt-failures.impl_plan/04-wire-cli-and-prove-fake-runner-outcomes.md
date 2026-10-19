# Step: Wire CLI selection and prove complete fake-runner diagnosis

## Goal

Make `sibu evals result --case ... --attempt ...` a thin entrypoint to the read-result command and prove the Story through disposable fake-runner-to-artifact-to-CLI cases.

## Scope

- Task ID: IERE-S01-T04; Milestone ID: IERE-S01-M02 (selectable bounded diagnosis); Status: done; Depends on: IERE-S01-T03.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-02–REQ-05, REQ-08 and AC-02/AC-05; `docs/features/incomplete-eval-run-evidence/sdd.md` “Execution and evidence boundaries”, “Main flow and failure branches” sequence diagram, “Quality strategy — planned, not yet run”; on-demand pointers: `src/entrypoints/cli/{create-program,evals-json}.ts`, `src/modules/local-evals-workbench/run-history/failure-locator-cli-acceptance.test.ts`, `src/modules/local-evals-workbench/run-execution/offline-project-fixture.ts`; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench CLI driving adapter. Validate option combinations syntactically: summary, case+attempt, and case+attempt+assertion are allowed; dangling case/attempt/assertion, invalid IDs, and unsupported field selection are blocked. Change help text accordingly. CLI only constructs command and serializes result; no artifact reads, origin inference, or raw content inspection.
- Use disposable project fake runners and fresh local artifacts for report-only, exit-only, report-plus-exit, timeout, malformed trailing event, and GeniusCR-shaped 17-case partial/error run (`approximate-price` incomplete, two completed, 14 not run). Assert persisted artifact and selected result match, bounded safe codes and counts, `not-captured` when no response was emitted, and no invented failed assertion/completed turn. Retain existing selected-assertion CLI path. No live model or GeniusCR repository edit.
- Privacy/security check: use a synthetic raw-content sentinel; ordinary summary and selected overview JSON, stderr, and structured logs must not contain it or raw provider content. S01 does not authorize capture of new provider-response bodies, source-field retrieval, uploads, or sharing local artifacts. Git exclusion is not access control; keep artifact read safety intact.

## Files

- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/evals-json.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `src/entrypoints/cli/evals-json.test.ts`
- `src/modules/local-evals-workbench/run-history/incomplete-attempt-cli-acceptance.test.ts` (new)

## Done when

- Task check: `pnpm build`; pass: CLI and complete slice compile; expected evidence: exit 0.
- Task check: `node --test bin/entrypoints/cli/create-program.test.js bin/entrypoints/cli/evals-json.test.js bin/modules/local-evals-workbench/run-history/incomplete-attempt-cli-acceptance.test.js bin/modules/local-evals-workbench/run-history/failure-locator-cli-acceptance.test.js`; pass: disposable fake-runner tests assert report vs exit facts (including both together), incomplete selection without assertion, timeout/malformed trailing checkpoint, 2/1/14 counts, `not-captured`, bounded safe JSON with no sentinel, and existing assertion selection; expected evidence: named CLI acceptance tests pass with persisted artifact and readback assertions.
- Task check: `pnpm verify`; pass: canonical aggregate builds and runs all compiled tests after changes stabilize; expected evidence: exit 0. Do not separately repeat its build/test responsibilities as final checks.
- Task check: `pnpm run validate:packed-runtime`; pass: installed-package runtime/CLI distribution validation, distinct from aggregate; expected evidence: exit 0.
- Task check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: every touched source file is at most 500 lines; expected evidence: exit 0. Keep new tests separate from existing 498-line execute-run handler test.
- Architecture completion check: inspect the touched imports, public slice boundaries, handler effect access, and CLI/composition wiring against `docs/architecture.md` § Operation contract and the SDD execution boundaries; pass only if the observed path remains entrypoint → command → handler → ports → adapters, handlers use injected ports rather than direct filesystem/process access, and CLI only adapts inputs/results. Record the inspected files and concrete dependency-compliance findings beside the source-size result in the progress log; a forbidden dependency or bypass blocks Task completion even if tests pass.
- Task check: `git diff --check`; pass: no whitespace errors; expected evidence: exit 0. Record evidence for all Done-when items in the story-local progress log during execution, not in this plan.
- Evidence class: end-to-end fake-runner acceptance, failure/edge, assertion-selection regression, privacy/output invariant, packaged-runtime regression. Deeper fuzz/mutation and manual QA omitted because deterministic branch fixtures and output bounds answer the planned Story questions; residual limit: fake runners cannot prove live provider behavior or unmodified GeniusCR emissions.
