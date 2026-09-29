# Reviewed Conditional Flag Decisions

Business source: `src/modules/template-catalog/fixtures/scrum-deployable-slices/sample-brd.md`, `REQ-06`–`REQ-08`, `REQ-10`.
These are review samples, not a claim that static tests prove every future planning judgment.

## No flag needed
An internal-only, backward-compatible read path is complete and deployable. Write an unflagged Story with `behind flag: no`; do not ask a speculative flag question.

## Explained need and user decision
The first customer-facing step would expose an unfinished checkout flow when merged. Explain that concrete exposure risk and ask: “Do you want to use a flag for this capability?” Do not ask the user whether a flag is needed.

## Refusal with viable slice
The user says no. Combine the bounded checkout steps into one complete, independently deployable and reviewable Story; preserve `behind flag: no` and do not silently introduce a flag.

## Refusal without viable slice
The user says no, but completing the flow in one Story would not be reviewable. Present that deployability/reviewability conflict and stop for a human decision; do not finalize a horizontal-only Story.

## First accepted flag: missing mechanism
The user says yes. The project SAD has no clear flag mechanism. Ask once whether to use the existing framework, an external service, or a project-local mechanism. If the user has no preference, recommend one concisely and obtain an explicit choice. Pause for a user-directed `software-architecture-writer` SAD update. Then pause for a user-directed `software-design-writer` feature SDD revision with off/on behavior, defaults, migration conditions, and safety. Do not write flagged artifacts yet.

## Later feature: established mechanism
The user says yes. The project SAD already records a mechanism; reuse it without another mechanism question. Ask only for missing feature-specific behavior and pause for `software-design-writer` to revise this feature's SDD. Do not write flagged artifacts yet.

## Resume after source handoffs
After the project SAD and feature SDD are available and consistent, reread the revised SDD. Write the flagged Epic, flagged Story, and final removal Story together. Do not edit either upstream source in Scrum planning.
