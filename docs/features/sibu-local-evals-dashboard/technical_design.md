# Technical Design: Sibu Local Evals Workbench

## Inputs

- Product vision: `docs/product-vision.md`
- Business Domain Model: `docs/business-domain-model.md`
- Capabilities Map: `docs/capabilities-map.md`
- Deep Module Map: `docs/deep-module-map.md`
- BRD: `docs/features/sibu-local-evals-dashboard/brd.md`
- UX spec: `docs/features/sibu-local-evals-dashboard/ux.md`
- Selected Deep Module: `local-evals-workbench`
- Delegated skills: `command-pattern`, `clean-code`, `typescript`, `structured-logging`

## Summary

Add `sibu evals` as a command-oriented vertical slice in the new Local Evals Workbench module. The command starts a Sibu-owned local web workbench from the target project root, discovers conventional project eval suites, runs all test cases or one selected test case, exposes normalized matrix results, supports one-failed-assertion-at-a-time LLM analysis, drafts concrete repair proposals, and applies only explicitly approved mutations to non-secret files inside the project root.

The evaluated project contributes repo-owned eval artifacts under root `evals/` and may contain repair target files anywhere inside the project. The browser UI never receives provider credentials; local server handlers read `OPENAI_API_KEY` and optional `SIBU_EVALS_MODEL` server-side.

## Existing Context

- CLI entrypoint is `src/entrypoints/cli/create-program.ts`; command routing goes through `src/entrypoints/cli/execute-command.ts` and `src/entrypoints/cli/command.ts`.
- Existing modules follow command/handler-style boundaries under `src/modules/<module-slug>/`.
- `workflow-state-ledger` can load Sibu state; `workflow-health-inspector` can verify whether a repo workflow is healthy enough for mutation-sensitive work.
- rpgizer has a reusable UX/code baseline in `/home/juanca/code/rpgizer/src/app/evals/`, especially:
  - `eval-matrix-screen.tsx`
  - `eval-matrix-client.tsx`
  - `eval-cell-detail-drawer.tsx`
  - `eval-test-case-list.tsx`
  - `eval-matrix-table.tsx`
  - `eval-matrix-view-model.ts`
- Sibu currently has no web runtime dependency. The design should avoid requiring every target project to be a Next.js project.

## Proposed Design

### Module and Entry Boundaries

Create a new Deep Module implementation area:

```txt
src/modules/local-evals-workbench/
```

Primary command slices:

1. `start-local-evals-workbench`
   - Intent: start the localhost workbench for the current project.
   - Entrypoint: `sibu evals`.
   - Handler responsibilities:
     - resolve project root from current working directory
     - verify Sibu workflow state exists
     - discover eval suites enough to show initial dashboard state
     - load local env files and process env for server-side provider configuration
     - start local web server on localhost
     - print URL and local-only status
   - Ports:
     - workflow state reader
     - eval suite registry/discovery reader
     - env loader
     - local web server starter
     - logger

2. `run-local-eval-suite`
   - Intent: run one suite for all test cases or one test case with the selected eval-run model.
   - Called by local server endpoint/action, not directly by browser-side business logic.
   - Handler responsibilities:
     - validate suite id, run scope, and selected eval-run model
     - invoke project eval runner through the suite registry
     - normalize output into matrix result contracts
     - persist or expose run artifacts for the current workbench session
   - Ports:
     - eval suite registry
     - eval runner
     - run artifact writer/reader
     - logger

3. `analyze-failed-assertion`
   - Intent: analyze exactly one failed assertion from one cell result.
   - Handler responsibilities:
     - validate active failed assertion id belongs to the selected result cell
     - assemble minimal evidence: actual output/excerpt, failed assertion/grader, expected/reference context, diagnostics, relevant artifact previews
     - check `OPENAI_API_KEY`; use `SIBU_EVALS_MODEL` or documented default assistance model
     - call LLM adapter server-side
     - return analysis with likely cause classification and uncertainty
   - Ports:
     - run artifact reader
     - LLM analysis adapter
     - logger

4. `draft-eval-repair-proposal`
   - Intent: draft a concrete proposed file change for the active failed assertion and human-selected repair direction.
   - Handler responsibilities:
     - keep scope to one failed assertion unless explicitly given user direction to broaden
     - produce affected project file path(s), rationale, expected eval impact, and proposed patch/change representation
     - reject vague proposals that do not name target files or expected impact
   - Ports:
     - run artifact reader
     - project file reader
     - LLM proposal adapter
     - proposal store/session state
     - logger

5. `apply-approved-eval-repair`
   - Intent: apply one concrete user-approved repair proposal.
   - Handler responsibilities:
     - require proposal id and explicit approval marker from the local UI
     - revalidate project-root containment
     - reject likely secret/credential files and writes outside the project root
     - apply exactly the approved mutation
     - report changed files and rerun recommendation
   - Ports:
     - proposal store/session state
     - safe project file mutator
     - workflow health/readiness checker when needed
     - logger

Entrypoints must only adapt CLI or local HTTP input into Commands and translate Results. They must not import filesystem mutation, LLM SDKs, eval runner internals, or workflow state implementation directly.

### Local Web Runtime

`start-local-evals-workbench` should serve a Sibu-owned local web app rather than installing a Next.js app into the target project. The target project supplies eval artifacts; Sibu supplies the runtime, UI bundle, server endpoints, and command handlers.

MVP runtime direction:

- Bind to localhost only.
- Choose a free port or fail with a clear port message.
- Print the URL; auto-open can be deferred or optional.
- Serve static client assets from Sibu's packaged runtime output.
- Expose local JSON endpoints/actions for suite listing, run requests, analysis requests, proposal drafting, and approval application.
- Keep all provider credentials and project file mutation on the server side.

If a framework is used for the web runtime, it must be packaged with Sibu and hidden behind the local server starter port. Do not require the evaluated project to have Next.js, React, or web dependencies.

### Eval Workspace Convention

MVP discovery uses a root-level project folder:

```txt
evals/
```

The Local Evals Workbench should define a Sibu eval format with these conceptual parts:

- suite metadata: id, name, description, purpose
- test cases: id, name, input variables or fixture reference
- assertions/graders: id, label, type, rubric/rule, expected/reference context
- run adapter: project-defined or convention-defined execution hook
- artifacts: output, expected/reference previews, diagnostics, metrics, raw artifact references

The technical design should not overfit to rpgizer's domain-specific eval modules, but it should preserve the normalized result contract shape that made the rpgizer matrix work: suites, variants/models, test cases, cells, assertions, diagnostics, metrics, artifacts, and aggregates.

### Result and View Model Contracts

Define module-local TypeScript contracts for:

- `EvalSuiteSummary`
- `EvalTestCaseSummary`
- `EvalRunScope = all | test_case`
- `EvalRunModel`
- `EvalRunResult = passed | failed | blocked | error`
- `EvalMatrix`
- `EvalCell`
- `EvalAssertionResult`
- `EvalDiagnostic`
- `EvalArtifact`
- `FailureAnalysis`
- `RepairProposal`
- `ApprovedRepairResult`

Use discriminated unions for lifecycle states and result outcomes. Treat project-loaded eval definitions and local endpoint payloads as untrusted `unknown` at boundaries and narrow before use.

The UI should receive view models, not raw project eval definitions. Adapt the rpgizer view-model layer into Sibu-specific naming and drawer states.

### Model Configuration

There are two separate model concerns:

1. **Eval-run model**
   - Selected in the dashboard run controls.
   - Passed to `run-local-eval-suite`.
   - Represents the model being evaluated.

2. **Workbench assistance model**
   - Used only for failure analysis and proposal drafting.
   - Loaded server-side from `SIBU_EVALS_MODEL` when present, otherwise a documented default.
   - Requires `OPENAI_API_KEY` for OpenAI-backed assistance.

The local browser UI may show whether analysis is available and which assistance model label is active, but it must never receive API key values.

### One-Failure Conversation Model

A failed cell may contain multiple failed assertions. The workbench must model active conversation scope as:

```txt
suite id + test case id + variant/model id + assertion/grader id
```

Conversation state and proposal state must stay attached to that active failed assertion. Switching the active assertion should either start a new conversation scope or clearly switch history to that assertion. Proposal drafting should not merge multiple failed assertions unless the user explicitly asks for a broader repair after reviewing them.

### Proposal and Mutation Safety

Repair proposals may target any project file, not only files under `evals/`, because prompts and workflow behavior can live elsewhere. Mutation safety rules:

- require explicit approval for one concrete proposal
- require target paths to resolve inside the project root
- reject likely secret/credential files, including common env files and private key material
- reject writes outside project root, symlink escapes, absolute paths outside root, and path traversal
- apply only the approved patch/change representation
- report changed files after mutation
- recommend rerunning the focused test case first

Proposal preview must show at minimum:

- affected project file(s)
- change summary
- rationale
- expected eval impact
- approval action

### Workflow Health and State

`start-local-evals-workbench` should require an initialized Sibu workflow. If `.sibu/state.json` is missing or invalid, block with guidance to run `sibu init` or repair workflow state through existing Sibu maintenance guidance.

Before applying an approved repair to Sibu-managed workflow files, the apply handler should use workflow health/readiness checks so it does not silently overwrite ambiguous local drift. For ordinary project files, project-root and sensitive-file checks are the primary safety gates.

### Eval-Authoring Skill and Templates

The feature requires Sibu to distribute an eval-authoring skill and any conventional eval templates through Template Catalog / Skill Guidance, not through Local Evals Workbench internals.

If those templates are changed during implementation, use the `sibu-template-change` skill. The Local Evals Workbench should consume the convention; it should not own template catalog metadata.

### Observability

Use structured logs for meaningful local operations:

- workbench server start/stop/failure
- suite discovery outcome
- eval run start/completion/failure
- LLM analysis unavailable/start/completion/failure
- proposal drafted/rejected/approved/applied
- mutation blocked by safety policy

Logs must not include API keys, raw prompts, full model outputs, full eval outputs, or full patch content. Use safe metadata: suite id, test case id, assertion id, run scope, model labels, counts, duration, outcome, and changed file count.

## Quality Strategy

- Unit test command handlers with fake ports for discovery, run scope validation, result normalization, one-failure analysis scoping, proposal lifecycle, and mutation safety.
- Add focused safety tests for path traversal, symlink escapes, writes outside root, likely secret files, missing approval, stale proposal ids, and managed-file readiness blocking.
- Add contract tests for loading/validating Sibu eval definitions from `evals/` fixtures.
- Add UI/view-model tests adapted from the rpgizer baseline for filters, run scope labels, failed assertion queue selection, analysis unavailable state, and proposal-ready state.
- Add integration-style tests for the local server endpoints using fake eval suites and fake LLM adapters.
- Manual QA should cover phone stacked list, desktop matrix, drawer focus management, keyboard navigation, missing `OPENAI_API_KEY`, `SIBU_EVALS_MODEL`, run-one-test-case rerun, and approved mutation reporting.

Deeper fuzz/property testing is useful only for path safety and payload narrowing; broad fuzzing of the whole UI is not necessary for MVP.

## Validation

Later implementation should run:

```txt
pnpm run build
pnpm run check
pnpm run test
pnpm run validate:packed-runtime
```

Also validate manually in a sample Sibu-managed project:

```txt
sibu evals
```

Manual validation should include a project with no `OPENAI_API_KEY`, a project with `OPENAI_API_KEY` and `SIBU_EVALS_MODEL`, a failed cell with multiple failed assertions, and an approved proposal that targets a non-`evals/` project file.

## Risks / Tradeoffs

- Shipping a local web runtime inside a CLI increases packaging and runtime complexity, but avoids imposing Next.js or dashboard dependencies on target projects.
- Allowing approved repairs to mutate any project file is necessary for prompt changes, but it makes path safety, sensitive-file blocking, and diff clarity non-negotiable.
- LLM-generated proposals can be persuasive but wrong; analysis, proposal, approval, mutation, and rerun must remain separate states.
- Sibu eval format should be narrow enough for MVP but versionable enough to evolve once real projects create suites.
- Local server endpoints are local-only, but they still need careful input validation because they can trigger file reads, LLM calls, eval runs, and approved mutations.
