---
name: higher-value-testing-guidance
description: Choose valuable, maintainable tests for code changes without making a new test mandatory.
---

# Higher-Value Testing Guidance

For tests added or changed in the current task, first ask whether a test could catch a realistic regression or violated requirement and add confidence beyond existing checks. If none would, do not add a test solely to satisfy a testing habit or coverage target. Planned Task Checks still apply even when no new test is useful.

When a test adds value:

- Assert observable outcomes and side effects, not private implementation structure. Use meaningful assertions that would fail for the behavior being protected.
- Cover relevant boundaries, invalid inputs, state transitions, and failure paths in proportion to their risk; avoid redundant or superficial cases.
- Use the lowest level that gives distinct confidence: unit for isolated logic, integration for component boundaries, and end-to-end for critical user workflows.
- Keep tests deterministic, independent, easy to understand, and small enough to diagnose. Use only the setup needed to exercise the behavior.

Do not impose test-first development, coverage quotas, per-test written justifications, or unrelated test-suite cleanup. Avoid brittle tests of specific file wording or unit tests of Markdown structure. Use the dedicated eval skills, not this skill, to author or run evaluations of actual AI behavior.
