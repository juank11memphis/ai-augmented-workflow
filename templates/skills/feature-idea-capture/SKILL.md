---
name: feature-idea-capture
description: Use when the user wants to capture, save, jot down, or add a rough future feature, product, workflow, or improvement idea without turning it into a backlog item, feature brief, or implementation task.
---

# Feature Idea Capture

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

Capture rough future ideas quickly in `docs/feature-ideas.md`.

## Behavior

- Write the idea down directly. Do not interview the user before capture.
- Keep the idea intentionally raw: a short heading and a few bullets are enough.
- If `docs/feature-ideas.md` does not exist, create it on first use.
- Append new ideas; do not classify, prioritize, groom, or turn them into backlog work.
- Do not create feature briefs, epics, stories, implementation plans, or code from captured ideas unless the user separately asks for that later.
- Do not migrate, rename, inspect, or reconcile pre-existing alternate idea files.

## File shape

Use this lightweight shape:

```md
# Feature Ideas

## <Idea title>

- <Short note>
- <Short note>
```

If the file already exists, preserve its current content and append the new idea using the same simple style.
