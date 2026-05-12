# Step: Prompt for Notion parent page

## Goal

Add a reusable interactive prompt that asks for the Notion docs destination parent page without asking for workspace selection or attempting Notion validation.

## Scope

- Add an `askForNotionDocsParentPage` prompt in the interactive guidance module.
- Prompt for a Notion parent page URL or page ID.
- Explain in prompt copy or validation text that the configured Notion MCP connection must be able to access the page.
- Keep the prompt syntactic only; require non-empty text but do not validate against Notion.
- Export the prompt through the existing interactive guidance module boundary.
- Add prompt tests if existing patterns support it.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`
- `src/modules/interactive-guidance/prompts.test.tsx` or `src/modules/interactive-guidance/prompts.test.ts`

## Done when

- A reusable Notion parent page prompt is available to init and MCP use handlers.
- Prompt behavior does not ask for Notion workspace, credentials, OAuth, or permissions.
- Prompt cancellation follows existing initialization/interactive guidance behavior.
- Focused prompt tests pass where practical.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:47:52Z
