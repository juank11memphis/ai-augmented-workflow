---
name: eval-authoring
description: Use when creating, revising, or maintaining Sibu-format local eval suites, eval definitions, fixtures, assertions, graders, rubrics, expected/reference context, or conventional eval artifacts. Do not use for running evals, analyzing failures, drafting repairs, or applying approved repair proposals.
---

# Eval Authoring

## Purpose

Use this skill to create or maintain repo-local Sibu eval artifacts in the expected MVP format instead of inventing ad hoc structures. Keep the output reviewable, conventional, and owned by the project.

## Trigger scope

Use when the user asks to create, revise, or maintain:

- Sibu eval suites or eval definitions
- test cases, fixtures, or input variables
- expected outputs, reference context, rubrics, assertions, or graders
- run adapter notes or conventional eval artifacts under a project eval area

Do not use this skill for ordinary product tests, CI setup, dashboard workbench behavior, failure analysis conversations, repair proposals, or applying file mutations unless the user explicitly asks for eval artifact authoring.

## Required inputs

Before writing or changing eval artifacts, identify:

- suite purpose and target behavior being evaluated
- target prompt, skill, command, agent, or workflow under test
- test case names with inputs or fixture variables
- expected output, reference context, or rubric for each case
- assertions or graders that decide pass/fail
- execution hook or run adapter that will produce actual outputs
- artifact paths the user expects you to create or update

## Hard stops and clarification

Hard-stop or ask one focused clarification when any required input is missing or ambiguous enough to change pass/fail meaning. Do not invent hidden expectations, undocumented reference answers, fake execution hooks, or project-specific suite structure.

Hard-stop if the request would require you to:

- run evals or add runtime eval execution logic
- analyze failures, draft repairs, or apply approved repairs
- mutate unrelated project files outside the requested eval artifacts
- overwrite arbitrary existing eval suites without explicit scope
- add secrets, credentials, private data, or full proprietary prompts as fixtures

## Outputs

Prefer small, conventional artifacts plus a short summary:

- eval suite metadata
- test case definitions
- fixture or input-variable files when repeated inputs would clutter cases
- expected/reference context or rubric text
- assertion/grader definitions
- run adapter expectations, not implementation, when the hook is external
- run artifact/result location conventions, not generated results

## Sibu MVP eval format

Use the project's existing convention when present. If no convention exists and the user still wants a new Sibu MVP eval, use this minimal shape as guidance and adapt only with explicit user approval:

```json
{
  "id": "skill-authoring-boundaries",
  "name": "Skill authoring boundaries",
  "description": "Checks that generated skill guidance respects required boundaries.",
  "target": {
    "kind": "skill|prompt|command|workflow",
    "path": "relative/project/path"
  },
  "run": {
    "adapter": "documented-command-or-script",
    "modelVariable": "SIBU_EVALS_MODEL"
  },
  "cases": [
    {
      "id": "missing-required-context",
      "name": "Missing required context",
      "input": { "request": "Create an eval for an unspecified behavior." },
      "expected": { "reference": "The agent asks for focused clarification before writing pass/fail criteria." },
      "assertions": [
        {
          "id": "hard-stops-before-inventing",
          "type": "contains|not-contains|rubric|json-path|custom",
          "criteria": "Must ask for missing target behavior and expected/reference context."
        }
      ]
    }
  ],
  "artifacts": {
    "resultsDir": "evals/artifacts/<suite-id>/",
    "keep": ["inputs", "actual output excerpt", "assertion results", "grader notes"]
  }
}
```

### Conventional artifacts

Keep artifacts boring and discoverable:

```text
evals/
  <suite-id>.json
  fixtures/<suite-id>/<case-id>.json
  references/<suite-id>/<case-id>.md
  artifacts/<suite-id>/.gitkeep
```

A suite should describe what is evaluated. Cases should provide inputs. Fixtures should hold larger reusable input variables. References should capture expected context or rubrics. Assertions/graders should be explicit enough for reviewers to understand pass/fail. Run adapters should be named and documented, but implemented only when the user asks for execution work. Artifacts/results should contain outputs and grader/assertion results produced by actual eval runs, not by this authoring guidance.

## Boundaries

This skill guides eval creation and maintenance only. Delegate eval execution, failure analysis, repair proposal drafting, and approved repair application to the Local Evals Workbench flows or another explicitly requested implementation task.
