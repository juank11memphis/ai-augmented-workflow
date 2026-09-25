---
name: eval-authoring
description: Use when creating, revising, or maintaining Sibu-format local eval suites, eval definitions, fixtures, assertions, graders, rubrics, expected/reference context, or conventional eval artifacts. Do not use for running evals, analyzing failures, drafting repairs, or applying approved repair proposals.
---

# Eval Authoring

## Purpose

Use this skill to plan and create repo-local Sibu eval artifacts. Confirm the Evaluation Targets and obtain approval of a risk-based Eval Coverage Plan before writing project files. Keep the output reviewable, conventional, and owned by the project; do not claim exhaustive coverage.

## Trigger scope

Use when the user asks broadly to create evals for a project, or directly names an AI integration, agent, prompt, or workflow to evaluate. Also use when asked to revise or maintain:

- Sibu eval suites or eval definitions
- test cases, fixtures, or input variables
- expected outputs, reference context, rubrics, assertions, or graders
- run adapter notes or conventional eval artifacts under a project eval area

Do not use this skill for ordinary product tests, CI setup, dashboard workbench behavior, failure analysis conversations, repair proposals, or applying file mutations unless the user explicitly asks for eval artifact authoring.

## Discover and confirm Evaluation Targets

- For a broad request, inspect repo-local AI integrations, prompts, tests, code, and docs. Present a concise list of likely targets with paths and brief evidence; ask the user which targets and scope to evaluate.
- For a directly named target, inspect that target and relevant repo evidence without an unnecessary broad discovery scan. Confirm the named target and intended scope with the user.
- **Stop before coverage planning until the user confirms the targets.** Do not infer confirmation from the initial request, even when it directly names a target.

## Eval Coverage Plan

For confirmed targets, present a reviewable plan before generating files. For each target, include proposed scenarios and the evidence for intended behavior; choose deterministic assertions for exact behavior, references for grounded expected content, or inspectable rubrics for qualitative behavior. Describe simulated tool selection, arguments, order, results, errors, and unexpected responses when tools apply; do not plan real external tool side effects.

Assess each category explicitly: happy path, edge case, failure, abuse, safety, ambiguous input, malformed input, adversarial input, multi-turn behavior, tool behavior, and nondeterminism. Mark each **covered**, **not applicable** with a reason, or a justified **Coverage Gap** with its risk and what would resolve it. Do not label open-ended model behavior exhaustively covered.

Ask the user to approve or correct the target-specific plan, including scenarios, grading choices, tool behavior, and gaps. **Stop before writing any suite, runner, fixture, or other project file until the user approves the Eval Coverage Plan.** Approval of targets alone is not coverage approval.

## Required inputs for generation

Before writing or changing eval artifacts, identify:

- suite purpose and target behavior being evaluated
- target prompt, skill, command, agent, or workflow under test
- test case names with inputs or fixture variables
- expected output, reference context, or rubric for each case
- assertions or graders that decide pass/fail
- execution hook or run adapter that will produce actual outputs
- artifact paths the user expects you to create or update

## Hard stops and clarification

If repo-owned code, prompts, tests, and docs cannot establish a meaningful expected behavior or pass/fail criterion, ask one focused question and stop planning that expectation or generating files until the user clarifies it. Record unresolved coverage as a gap; do not invent hidden expectations, undocumented reference answers, fake execution hooks, or project-specific suite structure.

Hard-stop if the request would require you to:

- run evals or add Sibu runtime eval execution logic (project-owned runner/test-support generation is allowed after coverage approval)
- analyze failures, draft repairs, or apply approved repairs
- mutate unrelated project files outside the requested eval artifacts
- overwrite arbitrary existing eval suites without explicit scope
- add secrets, credentials, private data, or full proprietary prompts as fixtures

## Generate version-2 artifacts

Read [the version-2 contract](references/version-2-contract.md) before generation. New suites must use version 2, never legacy `run`/`cases` fields or predefined actual outputs. Inspect the target repository's language, framework, dependency versions and existing test seams; follow its installed language and clean-code guidance, plus structured-logging for operational code. Coverage approval does not waive separate repository code-change permission rules.

For every confirmed target, implement the approved plan without silently dropping scenarios:

- Create suite metadata, test case definitions, applicable single-turn and multi-turn cases, fixtures or input-variable files, expected/reference context, deterministic assertions, custom graders and inspectable rubrics.
- Embed reviewed coverage dispositions, reasons and justified gaps. Separate standard Sibu assertions from runner-owned custom/rubric grading.
- Create a runnable project-owned runner and test support using the contract's describe, estimate and execute operations. Invoke the real target integration with the selected Model Under Evaluation and a separately selected optional Judge Model; never substitute static expected outputs for target behavior.
- Generate conventional runner tests with fake model/judge ports, not live model or external tool calls. Verify actual target dispatch, conversation state within attempts, reset between attempts and zero production tool-client calls. These tests are allowed during authoring; executing generated evals is not.
- For an unfamiliar framework, use focused inspection and prove the adapter/mocking seam with conventional tests. If imports, model compatibility or isolation remain uncertain, ask for focused clarification and stop generation; do not invent SDK behavior or label a placeholder runnable.

## Tool and data safety

Replace production tool handlers with suite-declared mocks before target initialization/execution. Require an explicit eval-mode marker, record selection, normalized arguments and order, and support deterministic success, error and unexpected-response outcomes. Fail closed for undeclared, extra, out-of-order or mismatched calls; never fall back to production clients. If isolation requires production changes, stop rather than modifying production files. Production prompts and integrations remain unchanged.

Use synthetic or redacted fixtures only: no secrets, credentials, raw production data or live endpoints. Reference proprietary prompts at their existing source rather than copying them. Validate project-root-contained lexical paths and nearest existing real paths before artifact reads/writes, including symlink parents. Use command argument arrays without shells and declared environment names only. Bound and redact evidence before emission or persistence; fail closed when safe redaction is uncertain. Diagnostics must not expose sensitive payloads. Trusted project runners are not an OS sandbox.

## Conventional artifacts and Git safety

```text
evals/
  <suite-id>.json
  runners/<suite-id>.<project-language-extension>
  fixtures/<suite-id>/<case-id>.json
  references/<suite-id>/<case-id>.md
  tests/<suite-id>.<project-test-extension>
```

Preserve existing Git rules; add the root `/evals/artifacts/` exclusion without clobbering them. Verify effective ignore and no tracked artifacts using the reference's Git checks. Missing Git, conflicting ignore rules (including later negations), or tracked artifacts require user guidance; never automatically delete or untrack files. Do not create run results or tracked placeholders. Keep ignored artifacts out of ordinary agent context.

## Outputs

Report created/changed paths, setup prerequisites and selected models, conventional test commands/results, coverage summary and gaps, and how the user can later invoke the direct runner protocol. Include concise setup/protocol/test instructions appropriate to the project stack. Distinguish directly runnable protocol support from dashboard version-2 execution, which may not yet be available. Do not claim live-agent compliance from static checks or fake-port tests.

## Boundaries

This skill guides eval creation and maintenance only, including project-owned runners after approval. Do not modify production prompts/integrations or add Sibu runtime execution behavior. Delegate eval execution, failure analysis, repair proposal drafting, and approved repair application to the Local Evals Workbench flows or another explicitly requested implementation task.
