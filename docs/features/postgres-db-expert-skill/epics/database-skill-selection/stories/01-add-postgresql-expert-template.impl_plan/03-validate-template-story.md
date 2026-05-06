# Step: Validate PostgreSQL Expert template story

## Goal

Verify the new template and manifest metadata satisfy the story without leaking scope into selectable catalog or command behavior.

## Scope

- Manually inspect `templates/skills/postgresql-expert/SKILL.md` for the story's content requirements and out-of-scope boundaries.
- Manually inspect `templates/manifest.json` for the new entry and global template version bump.
- Run the smallest useful validation available for template/manifest health.
- Do not implement catalog registration, state fields, init prompts, or skill commands in this story.

## Files

- `templates/skills/postgresql-expert/SKILL.md`
- `templates/manifest.json`

## Done when

- Manual inspection confirms the skill is concise and practical.
- Manual inspection confirms manifest metadata is present and the global template version is incremented.
- `pnpm run build` passes.
- If a validation command fails for reasons unrelated to this story, record the failure and stop before broad fixes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:01:06-06:00
