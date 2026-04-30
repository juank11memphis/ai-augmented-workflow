# Step: Add global context-budget guidance

## Goal

Update the managed global agent template with concise context-budget discipline so every Sibu-guided agent treats context as a shared user budget before task-specific skills are loaded.

## Scope

- Add a short, high-leverage context-budget section to `templates/AGENTS.md`.
- Cover narrow snippets before full-file reads, targeted searches, avoiding noisy dependency/generated/build/cache content, summarizing large diffs/logs/output/artifacts, concise responses by default, and warning or asking before optional expensive context operations.
- Preserve the quality rule: token savings must not reduce correctness, safety, validation, human control, or required context gathering.
- Keep wording brief and non-repetitive with the existing communication, safety, and Sibu maintenance guidance.
- Do not edit generated project files, provider-specific token accounting, skill templates, or unrelated workflow rules in this step.

## Files

- `templates/AGENTS.md`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/02-add-global-context-budget-discipline.md`
- `docs/features/token-conscious-ai-workflow/feature_brief.md`
- `docs/features/token-conscious-ai-workflow/technical_design.md`
- `docs/features/token-conscious-ai-workflow/token_consumption_inventory.md`

## Done when

- `templates/AGENTS.md` tells agents to prefer narrow context before broad reads.
- The guidance discourages full dumps, broad recursive scans, and uncapped output unless needed or requested.
- The guidance says large diffs, logs, command output, and generated artifacts should be summarized by default.
- The guidance avoids generated, dependency, cache, build, and lockfile content unless relevant.
- The guidance reinforces concise responses by default.
- The guidance explicitly preserves Sibu's non-negotiable quality bar.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:30:47-06:00
