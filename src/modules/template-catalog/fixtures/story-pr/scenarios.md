# Final Story PR scenarios (written-contract examples)

- One Milestone: accepted plan, correct Story branch, checked T-01 commit, progress, and passing Story validation → main opens one PR; human makes one final M-01/Story decision.
- Multiple Milestones: verified M-01 advances automatically to M-02; after final checked Tasks and Story validation, main opens one PR for final M-02/Story decision.
- Early or wrong-branch attempt: no PR; stop for missing check/commit/progress, unfinished Story validation, stale plan identity, or wrong Story branch.
- CI reporting: passing is passing; failing is failing; pending is pending; unavailable is unavailable. Never relabel an unrun check as passing.
- Final PR change request: revise checked Tasks, invalidate plan identity, obtain fresh independent plan-only architecture review, use the AFK planner-reviewer loop for actionable findings and stop for material decisions, execute and revalidate after clean acceptance, then update the same PR with review history for one renewed final decision.
- Host failure: unavailable PR hosting, creation, or check retrieval preserves Story branch and evidence, reports blocker, and leaves final review incomplete; no alternate approval, merge, or deploy.
- Task executor does not create, approve, or update the PR.
