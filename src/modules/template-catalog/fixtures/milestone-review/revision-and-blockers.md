# Revision and blocked paths

Human-requested changes during execution or PR review: planner creates or revises bounded Tasks with executable checks and expected evidence; plan v2 invalidates v1 acceptance.
Plan v2 without Task checks: no dispatch.
Plan v2 without fresh independent plan-only architecture review: no dispatch.
Plan v2 with a finding or unresolved risk but without explicit human acceptance of its exact identity: no dispatch.
Plan v2 with a complete clean review and unchanged identity: automatically accepted; dispatch next Task.
Stale plan identity at dispatch: stop; no dispatch.
Blocked T-01: M-01 incomplete; no review-as-success and no M-02 dispatch.
Consequential architecture change at M-01: stop for human decision; no M-02 dispatch.
