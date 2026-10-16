# Feature Ideas

## Carry forward deferred QA through bounded plan repairs

- When a user explicitly defers Story-level behavioral QA, keep that decision as a merge stop across later bounded, source-aligned plan revisions instead of asking them to accept the same risk again.
- Still require a fresh independent review of each changed plan; automatically continue only when the repair is bounded, the review has no new findings or risks, and the deferred-QA scope is unchanged.
- Return to the user for any new material decision, changed QA risk, unsafe state, or non-converging repair. Never treat deferred QA as completed or merge the Story before its required review.

## make eval-authoring skill not to make the AFK planner/implementor stop

##
Issue: A full-suite run can contain cases that need a Judge model and cases that don’t. Right now, the run may use the first case’s model settings for every case. If the first case doesn’t need a Judge, a later case that does could run incorrectly.

Fix: Run cases in groups with matching model settings, while keeping them together as one suite run. That work was planned for Story 3; moving the necessary part into Story 2 would make this Story safe to finish.

## Unattended recovery from broad Story validation failures

- Capture a complete, compact failure inventory when an aggregate check fails; group failures by likely cause and trace each to the Story Task, contract, and owning paths instead of treating a truncated log or test count as a material decision.
- Compare focused failures against the observed Epic/base head in isolation, and distinguish pre-existing regressions and host/test-runner failures from changes introduced by the current Story. Permit narrowly reviewed prerequisite repairs for pre-existing failures when ownership and safety are clear.
- Preserve the blocked Task's unstaged edits. For clear, bounded, path-disjoint same-Story regressions, add independently reviewed follow-up checked Tasks, execute them in order, then resume the blocked Task and rerun checks made stale by the repairs. Use a reviewed same-Task continuation when edits overlap.
- Continue without routine human approval only while attribution, source alignment, checks, evidence, Git state, and progress stay clear. Stop for material decisions, ambiguous causes, unsafe overlap, or non-convergence; never weaken checks or claim a failed run passed.

## Verify PR merge requirements through GitHub MCP

- Avoid shell `gh api` calls for repository rulesets and branch protection when GitHub MCP can provide the required-check and merge-policy facts.
- If MCP cannot provide them, explain the capability gap and minimize host approval prompts for read-only verification during Story and Epic PR handoffs.
