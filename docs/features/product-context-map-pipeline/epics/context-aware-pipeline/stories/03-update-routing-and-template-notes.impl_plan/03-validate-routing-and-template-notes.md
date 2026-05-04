# Step: Validate routing and template notes

## Goal

Verify that routing and manifest updates satisfy the story without introducing template or TypeScript regressions.

## Scope

- Manually review `templates/AGENTS.md` for concise Product Context Map routing and pipeline ordering.
- Manually review `templates/manifest.json` change notes for clear sync messaging about the required managed skill and context-aware downstream behavior.
- Run repository validation commands required by the story.
- If validation reveals that source TypeScript or generated `bin/**` parity changes are required, stop and ask because that exceeds the expected routing/template-note scope unless directly required for routing installation.

## Files

- `templates/AGENTS.md`
- `templates/manifest.json`
- `package.json`

## Done when

- Manual review confirms routing requests for Product Context Map work go to `product-context-map-writer`.
- Manual review confirms feature brief routing appears after Product Context Map routing and pipeline wording is clear.
- Manual review confirms manifest notes are user-facing and concise.
- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` or `pnpm verify` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:55:05Z
