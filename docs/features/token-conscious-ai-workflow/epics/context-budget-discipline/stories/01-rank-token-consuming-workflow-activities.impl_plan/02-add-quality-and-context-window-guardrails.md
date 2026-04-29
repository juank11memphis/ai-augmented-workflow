# Step: Add quality and context-window guardrails

## Goal

Strengthen the inventory so it preserves Sibu's quality bar: token savings remove waste only, and large context windows remain available for quality-critical work.

## Scope

- Add a clear quality-first principle to `token_consumption_inventory.md`.
- Include the principle that large context windows are a safety net, not a license to be careless.
- State that high-consumption activities are allowed when they protect correctness, safety, validation, or user control.
- Make the inventory read like decision support, not a ban list.
- Do not weaken the story's guidance in favor of minimizing tokens at all costs.

## Files

- `docs/features/token-conscious-ai-workflow/token_consumption_inventory.md`
- `docs/features/token-conscious-ai-workflow/feature_brief.md`
- `docs/features/token-conscious-ai-workflow/technical_design.md`

## Done when

- The inventory explicitly says token savings must not compromise quality.
- The inventory includes the context-window safety-net principle.
- The inventory explains that expensive context operations are acceptable when needed for quality.
- The inventory aligns with the feature brief's “WE DO NOT COMPROMISE QUALITY” rule.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T12:33:44-06:00
