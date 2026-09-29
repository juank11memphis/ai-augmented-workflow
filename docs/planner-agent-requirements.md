# Planner Agent: Requirements

## Role
The planner is the only agent that reads the broad project context. It turns upstream docs into a plan that executor agents can run unattended. Executors get only what each task hands them, so the planner does the reading and thinking once.

## Inputs
- Upstream docs: product_vision.md, business_domain_model.md, capabilities_map.md, sad.md, brd.md, sdd.md, ux.md (when UI-related)
- Epics and user stories
- Available skills (clean code, DDD, react, nextjs, golang, etc.)

## Output hierarchy
- **User story**: deployable, delivers value. Acceptance criteria live here.
- **Milestone** (optional): a checkpoint a human can review in a few minutes. Add only when a story is big enough that one review of the final PR would be painful (too large a diff, or too many distinct concerns to review at once). Because tasks are tiny, a story will often have dozens of them, so milestones are likely common; group tasks into milestones by reviewable outcome (e.g. "endpoint works," "UI wired up"), not by a task-count quota. If the whole story's diff is easy to review in one sitting, skip milestones.
- **Task**: the unit the executor loop actually runs.

Plan top-down (story → milestone → tasks). Execution is bottom-up.

## Task sizing
- One task = one clear outcome, one bounded implementation area, one testable success condition set, achievable in one context window and landing as one commit.
- Too large causes drift and compounding failure; too small causes overhead and context switching. Don't split below the point where a task still has a meaningful, verifiable outcome (e.g. a bug fix, a endpoint slice, a small migration, a component with its tests).
- Rule of thumb: if you can't define an objective pass/fail check for it, split it further. If you can describe "done" in a sentence or two without ambiguity, it's probably the right size.
- Each task must have an unambiguous done-state.
- Terminology: in many published autonomous-loop tools, the loop unit is called a "user story." In this framework that unit is a **task**; stories are the larger deployable slices above it.

## Each task must be self-contained
Include:
1. Goal, and the pass/fail check (tests, build, lint, visual diff, etc.)
2. Relevant acceptance criteria from the parent story
3. Decisions already distilled from the docs (e.g. "cancellation is an Order aggregate method, emits OrderCancelled, per sdd.md §4.2")
4. Pointers to the exact doc sections the executor may open on demand
5. The specific skills that apply (not all of them)
6. Dependencies and ordering relative to other tasks

Do NOT expect the executor to read product_vision, domain model, capabilities map, sad, or brd. Distill what it needs into the task.

## Feature flags
- The planner does not invent flags. It uses only the flags declared by the epic and its stories.
- Flag definition and wiring is one of the first tasks of the first flagged story, so later tasks build on it.
- Tasks touching flagged code have checks covering both states: flag off (existing behavior unchanged) and flag on (new behavior works).
- Every flagged epic must include a final story (or a final task set in the last story) that enables the feature for real and removes all its flags, so the epic ships to prod with no flags left. Plan this removal work at the same time as the flag itself, never as an afterthought.
- Removal tasks: delete the flag checks, keep the winning code path, delete the losing path and its tests, and verify with a check that no references to the flag remain in the codebase.
- Executors cannot create flags on their own.

## Verification design
- Primary gate is objective and non-LLM: tests, build, lint, architecture/boundary tests, visual diff.
- Prefer mechanically enforced rules (e.g. linters or architecture tests for DDD boundaries) over prose the agent must remember.
- Derive task and milestone checks from the story's acceptance criteria so every check traces back to "what done means."
- Where an LLM judge is used (milestone level, for things not mechanically checkable), give it a binary rubric (criteria A, B, C: yes/no), make it approve or reject rather than rewrite, and cap retries (e.g. 3) before escalating to a human.

## Review gates
- **Task**: automated check, then commit. No human.
- **Milestone**: human review or heavier automated check (integration/e2e), optionally a light LLM judge.
- **Story**: PR, full CI, human review, deploy.

## Executor loop (what the plan must support)
Each iteration is a fresh agent instance with clean context: read state from files, pick one task, implement, run the check, fix on failure, commit, append to the progress log, exit. State lives in files, not in the agent's memory.

## Files the planner must set up or maintain
- **Task list/backlog file**: the plan itself, with status per task
- **Conventions file**: durable rules and patterns; updated when a recurring lesson appears
- **Progress log**: appended by the executor each iteration (task, outcome, commit ref, gotchas, decisions, flags). Keep entries short, scope per story or compact periodically. Recurring lessons get promoted to the conventions file.

## Failure handling
- If an executor hits something the task didn't anticipate, it flags it and stops rather than improvising.
- The planner (or human) revises the affected tasks.
- Hard iteration caps per task; unresolved tasks escalate to a human.

## Safety
Executors run in a sandbox (container/worktree) with no access to real credentials.

## Quality control
Plan quality is the bottleneck. A human should review the plan, at least for the first several runs, before the loop runs AFK.

---

*Note: the core (small tasks, fresh context per iteration, objective checks, state in files, human review at the PR) matches what's commonly used in autonomous coding loops. The milestone layer and the LLM judge at that level are a synthesis, so treat them as things to test rather than established practice.*
