# Step: Create the token consumption inventory

## Goal

Create the story's primary artifact: a concise, inferred inventory that ranks common Sibu-guided activities by likely token consumption and explains lower-waste alternatives without claiming exact measurement.

## Scope

- Create `docs/features/token-conscious-ai-workflow/token_consumption_inventory.md`.
- Rank activities from highest to lowest inferred token consumption.
- Include practical categories from the story: broad recursive commands, full file dumps, full diffs, verbose command output, long explanations, and focused snippet reads.
- For each category, explain why it is likely expensive and what lower-waste behavior is preferred.
- State that the inventory is inferred guidance, not exact token analytics.
- Do not add CLI token tracking, billing estimates, or model-specific tokenizer details.

## Files

- `docs/features/token-conscious-ai-workflow/token_consumption_inventory.md`
- `docs/features/token-conscious-ai-workflow/feature_brief.md`
- `docs/features/token-conscious-ai-workflow/technical_design.md`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/01-rank-token-consuming-workflow-activities.md`

## Done when

- `token_consumption_inventory.md` exists in the feature folder.
- The inventory orders common activities from highest to lowest inferred token consumption.
- The inventory includes practical examples required by the story.
- The inventory identifies whether each activity should usually be summarized, narrowed, capped, avoided, or handed back to the user for direct review.
- The inventory avoids exact token counts, billing claims, model-specific analysis, and CLI automation scope.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T11:59:00-06:00
