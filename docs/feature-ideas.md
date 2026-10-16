# Feature Ideas

## Improve AFK Story execution and recovery

- When a user explicitly defers Story-level behavioral QA, keep that decision as a merge stop across later bounded, source-aligned plan revisions instead of asking them to accept the same risk again.
- Still require a fresh independent review of each changed plan; automatically continue only when the repair is bounded, the review has no new findings or risks, and the deferred-QA scope is unchanged.
- Return to the user for any new material decision, changed QA risk, unsafe state, or non-converging repair. Never treat deferred QA as completed or merge the Story before its required review.
- Prevent the eval-authoring skill from needlessly stopping the AFK planner/implementer: a full-suite run can mix cases that need a Judge model with cases that do not. Group cases by matching model settings within one suite run instead of applying the first case's settings to all cases. This was planned for Story 3; consider moving the needed part into Story 2 so that Story can finish safely.
- Capture a complete, compact failure inventory when an aggregate check fails; group failures by likely cause and trace each to the Story Task, contract, and owning paths instead of treating a truncated log or test count as a material decision.
- Compare focused failures against the observed Epic/base head in isolation, and distinguish pre-existing regressions and host/test-runner failures from changes introduced by the current Story. Permit narrowly reviewed prerequisite repairs for pre-existing failures when ownership and safety are clear.
- Preserve the blocked Task's unstaged edits. For clear, bounded, path-disjoint same-Story regressions, add independently reviewed follow-up checked Tasks, execute them in order, then resume the blocked Task and rerun checks made stale by the repairs. Use a reviewed same-Task continuation when edits overlap.
- Continue without routine human approval only while attribution, source alignment, checks, evidence, Git state, and progress stay clear. Stop for material decisions, ambiguous causes, unsafe overlap, or non-convergence; never weaken checks or claim a failed run passed.
- Avoid shell `gh api` calls for repository rulesets and branch protection when GitHub MCP can provide the required-check and merge-policy facts.
- If MCP cannot provide them, explain the capability gap and minimize host approval prompts for read-only verification during Story and Epic PR handoffs.

## Investigate commit and merge-message practices for Sibu branches

- The Sibu workflows are working well, but commit messages across branches and merge or squash-merge messages do not always feel right.
- Investigate best practices for Task commits, Story branches, and merge or squash-merge commits, then decide what guidance the workflow should provide.
