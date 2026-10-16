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

## make eval-authoring skill not to make the AFK planner/implementor stop

##
Issue: A full-suite run can contain cases that need a Judge model and cases that don’t. Right now, the run may use the first case’s model settings for every case. If the first case doesn’t need a Judge, a later case that does could run incorrectly.

Fix: Run cases in groups with matching model settings, while keeping them together as one suite run. That work was planned for Story 3; moving the necessary part into Story 2 would make this Story safe to finish.

##

In the Sibu repo, improve eval run reporting so a coding LLM can troubleshoot a failed case from evidence, not just a judge’s summary.

Current problem: `sibu evals run` identifies failed assertions, but `sibu evals result <suite> <run-id> --case <case-id> --assertion <assertion-id>` may return only a paraphrased `actual`, an expected threshold, and an artifact path. That does not reveal the exact model reply, what the model saw, or how the judge scored it.

Please inspect the existing runner, artifacts, result CLI, and repo instructions, then implement the smallest coherent change that makes a selected failed assertion expose:

- The exact raw model response for the relevant turn (text and structured tool calls), alongside any normalized response used by the runner.
- The relevant input messages and preceding conversation, plus tool requests/results and approved facts actually available at that turn.
- The assertion/rubric as evaluated, threshold, numeric score, and the judge’s exact response/rationale.
- Model and judge IDs, attempt number, relevant errors, and enough ordering/timing information to reconstruct what happened.

Keep the full-suite `run` output compact: it should provide reliable case/attempt/assertion locators. Put detailed evidence behind a selected-case/selected-assertion `result` command. If output must be bounded, make truncation explicit and provide a way to retrieve the omitted evidence; never silently replace or discard the raw response. Apply the repo’s privacy/security rules to secrets and customer data, marking any redactions so an LLM knows evidence is missing.

Distinguish model failure, judge disagreement, tool/runner failure, and incomplete runs in the output. Do not change eval rubrics or assertions merely to make cases pass. Add deterministic tests using fake model/judge/tool responses—including multi-turn, tool-calling, failure, redaction, and truncation cases—and update the CLI documentation.

Acceptance check: given a failed multi-turn assertion, an LLM using only the run locator and selected result output can quote the exact relevant assistant reply, identify what context and tool data it received, see the actual score and judge rationale, and state any remaining evidence gap without opening bulk artifacts or guessing

## Unattended recovery from broad Story validation failures

- Capture a complete, compact failure inventory when an aggregate check fails; group failures by likely cause and trace each to the Story Task, contract, and owning paths instead of treating a truncated log or test count as a material decision.
- Compare focused failures against the observed Epic/base head in isolation, and distinguish pre-existing regressions and host/test-runner failures from changes introduced by the current Story. Permit narrowly reviewed prerequisite repairs for pre-existing failures when ownership and safety are clear.
- Preserve the blocked Task's unstaged edits. For clear, bounded, path-disjoint same-Story regressions, add independently reviewed follow-up checked Tasks, execute them in order, then resume the blocked Task and rerun checks made stale by the repairs. Use a reviewed same-Task continuation when edits overlap.
- Continue without routine human approval only while attribution, source alignment, checks, evidence, Git state, and progress stay clear. Stop for material decisions, ambiguous causes, unsafe overlap, or non-convergence; never weaken checks or claim a failed run passed.
