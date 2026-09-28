# Planner Agent: Requirements

## Role
The planner is the only agent that reads the broad project context. It turns upstream docs into a plan that executor agents can run unattended. Executors get only what each task hands them, so the planner does the reading and thinking once.

## Inputs
- Upstream docs: product_vision.md, business_domain_model.md, capabilities_map.md, sad.md, brd.md, sdd.md, ux.md (when UI-related)
- Epics and user stories
- Available skills (clean code, DDD, react, nextjs, golang, etc.)

## Output hierarchy
- **User story**: deployable, delivers value. Acceptance criteria live here.
- **Milestone** (optional): a checkpoint a human can review in a few minutes. Add only when a story is big enough that one review at the end would be painful. If a story has roughly 5 to 10 tasks, skip milestones.
- **Task**: the unit the executor loop actually runs.

Plan top-down (story → milestone → tasks). Execution is bottom-up.

## Task sizing
- One task = one commit and one verification run (e.g. one function, one test case, one bug fix, one small migration).
- Rule of thumb: if you can't define an objective pass/fail check for it, split it further.
- Each task must have an unambiguous done-state.

## Each task must be self-contained
Include:
1. Goal, and the pass/fail check (tests, build, lint, visual diff, etc.)
2. Relevant acceptance criteria from the parent story
3. Decisions already distilled from the docs (e.g. "cancellation is an Order aggregate method, emits OrderCancelled, per sdd.md §4.2")
4. Pointers to the exact doc sections the executor may open on demand
5. The specific skills that apply (not all of them)
6. Dependencies and ordering relative to other tasks

Do NOT expect the executor to read product_vision, domain model, capabilities map, sad, or brd. Distill what it needs into the task.

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
