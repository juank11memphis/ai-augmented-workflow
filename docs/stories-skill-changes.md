# Epics & User Stories Skill: Required Changes

## Purpose of the change
The stories are now the input to a planner agent, which decomposes them into tiny tasks that executor agents run unattended. Anything vague in a story becomes a bad task downstream, and the loop can't resolve ambiguity on its own. So the skill's job shifts from "describe the feature for humans" to "produce a precise, testable, traceable spec that a planner can decompose without guessing."

## Story requirements

### 1. Deployable vertical slices
- Each story delivers a working, shippable increment (thin end-to-end slice, not a horizontal layer like "build the DB tables").
- Size target: decomposable into roughly 5 to 10 tasks. If it would need much more, split the story.
- Include what is explicitly **out of scope** to prevent sprawl.

### 2. Objectively testable acceptance criteria (most important change)
- Write criteria as binary pass/fail statements (e.g. Given/When/Then), with concrete examples and data where possible.
- No subjective wording ("fast," "intuitive," "clean") unless converted into a measurable threshold.
- Each criterion should be checkable by a test, build step, lint/architecture rule, or visual diff. If a criterion can't be checked mechanically, mark it explicitly as "needs human/LLM-judge review."
- The planner derives every task-level check from these, so they must be complete and unambiguous.

### 3. Traceability to upstream docs
- Reference exact sections of brd.md, sdd.md, ux.md (when UI-related), business_domain_model.md, and capabilities_map.md that the story relies on.
- Note which capability from the capabilities map the story serves.

### 4. Domain and technical context
- Identify the bounded context, aggregates, and domain events involved.
- Indicate layers touched (frontend, backend, data, infra) and the stack, so the planner can attach the right skills (clean code, DDD, react, nextjs, golang, etc.).
- Note contracts or interfaces the story must conform to (with references, not copies).

### 5. UX references (when UI-related)
- Link to the specific ux.md sections, designs, or reference screenshots. These can serve as baselines for visual-diff checks.

### 6. Non-functional criteria, made testable
- Performance, security, accessibility, and similar requirements are included only when relevant and always with measurable thresholds.

### 7. Deployability details
- Migrations, feature flags, config, or rollout notes needed for the story to ship safely.

### 8. Dependencies and ordering
- List dependencies on other stories, plus anything the story blocks.

### 9. Open questions gate
- Include an "open questions / assumptions" section.
- A story is only marked **ready for planning** when open questions are resolved or explicitly accepted as assumptions. Unresolved ambiguity must be surfaced to a human before the planner runs.

## Epic requirements
- State the outcome/goal, the capabilities it serves, and the list of stories.
- Define story sequencing and cross-story dependencies.
- Epics are organizational only. They are not fed to the planner or executor as work items.

## Format requirements
- Stable IDs for epics and stories (for traceability from task to story to epic).
- Consistent, predictable structure across every story (fixed sections, same order) so the planner can parse it reliably.
- Include a status field (e.g. draft, ready-for-planning, in-progress, done).

## Suggested story template (sections)
1. ID, title, epic, status
2. Summary (user value, one or two sentences)
3. In scope / out of scope
4. Acceptance criteria (binary, testable, tagged by how each is verified)
5. Domain context (bounded context, aggregates, events)
6. Technical context (layers, stack, contracts, doc references)
7. UX references (if applicable)
8. Non-functional criteria (measurable)
9. Deployability notes
10. Dependencies
11. Open questions / assumptions

## Explicitly not the skill's job
- Breaking stories into milestones or tasks (the planner does that).
- Deciding implementation details already owned by sdd.md.

---

*Note: the emphasis on testable acceptance criteria and small, well-specified units is consistent with how autonomous coding loops are commonly set up (a requirements/task file the agent works from, with objective checks). The specific template and the "ready for planning" gate are a synthesis, so adjust them to fit your framework.*
