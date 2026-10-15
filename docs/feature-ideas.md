# Feature Ideas

## Reviewer sub-agent quality loop

- Add a reviewer sub-agent that runs after implementation finishes and checks generated code against project standards.
- If the reviewer finds issues, loop work back to the planner-executor or executor, then return to reviewer after fixes.
- Include a clear loop limit or retry budget to prevent endless agent cycles.
- Always end with required human review, even when the reviewer sub-agent passes.

## Carry forward deferred QA through bounded plan repairs

- When a user explicitly defers Story-level behavioral QA, keep that decision as a merge stop across later bounded, source-aligned plan revisions instead of asking them to accept the same risk again.
- Still require a fresh independent review of each changed plan; automatically continue only when the repair is bounded, the review has no new findings or risks, and the deferred-QA scope is unchanged.
- Return to the user for any new material decision, changed QA risk, unsafe state, or non-converging repair. Never treat deferred QA as completed or merge the Story before its required review.

