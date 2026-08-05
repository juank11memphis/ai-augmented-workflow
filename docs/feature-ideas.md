# Feature Ideas

## Reviewer sub-agent quality loop

- Add a reviewer sub-agent that runs after implementation finishes and checks generated code against project standards.
- If the reviewer finds issues, loop work back to the planner-executor or executor, then return to reviewer after fixes.
- Include a clear loop limit or retry budget to prevent endless agent cycles.
- Always end with required human review, even when the reviewer sub-agent passes.

