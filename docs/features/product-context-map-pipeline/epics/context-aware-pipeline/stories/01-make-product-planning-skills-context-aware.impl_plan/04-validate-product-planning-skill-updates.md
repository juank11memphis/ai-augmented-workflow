# Step: Validate product planning skill updates

## Goal

Verify that the Product Context-aware feature brief and technical design skill changes satisfy the story without introducing template or TypeScript build regressions.

## Scope

- Review the changed skill templates for concise, non-duplicative Product Context guidance.
- Confirm every acceptance criterion in `01-make-product-planning-skills-context-aware.md` is covered by the template changes.
- Run repository validation commands required by the story.
- If validation reveals that implementation must change source TypeScript or generated `bin/**` parity, stop and ask because that exceeds the expected planning-skill template scope for this story.

## Files

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/manifest.json`
- `package.json`

## Done when

- Manual review confirms the feature brief writer requires an existing Product Context Map, identifies existing contexts, and stops before drafting when a new context appears necessary.
- Manual review confirms the technical design writer preserves selected Product Contexts and avoids inventing new ones.
- `pnpm build` passes.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:02:33Z
