# Feature Ideas

## Investigate commit and merge-message practices for Sibu branches

- The Sibu workflows are working well, but commit messages across branches and merge or squash-merge messages do not always feel right.
- Investigate best practices for Task commits, Story branches, and merge or squash-merge commits, then decide what guidance the workflow should provide.

## Selective test-first development for AI implementation

- Explore test-first work for suitable Sibu Tasks, not mandatory TDD or a coverage-percentage target. Favor tests that protect observable behavior, meaningful invariants, boundaries, or known regressions; avoid redundant tests and brittle exact-wording checks on prompt Markdown unless a literal string is a real contract.
- Have the planner identify the behavior and realistic failure each proposed test should catch. Where test-first work adds value, plan a failing test before implementation, then let the executor work through red, green, and refactor with objective evidence.
- Guard against passing tests by weakening assertions, changing approved tests, or hardcoding the expected answer. Changes to the agreed test contract should return for independent review; passing tests alone should not count as proof that the requirement is met.
- Evaluate this experimentally against the current workflow using independently verified correctness, regressions, maintenance burden, token cost, and elapsed time. The AI-and-TDD evidence mentioned in the originating conversation is promising but not established here and should be verified before making product claims.

## Remove redundant sub-agent toolboxes

- Review every Sibu-provided sub-agent and remove separate toolbox skills that duplicate the harness inherited from `AGENTS.md` and shared skills.
- Keep each agent definition small: its specific responsibility, task boundary, required input, and compact output. Put genuinely shared rules in the existing harness instead of repeating them per agent.
- Confirm the resulting agents still receive the required inherited instructions and preserve their safety and handoff behavior; do not assume inheritance covers task-specific context automatically.
