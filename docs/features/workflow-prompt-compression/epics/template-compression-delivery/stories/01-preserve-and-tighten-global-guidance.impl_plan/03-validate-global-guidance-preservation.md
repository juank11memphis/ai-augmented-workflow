# Step: Validate global guidance preservation

## Goal

Validate that the global guidance and routing changes for this story are audit-backed, do not weaken quality-critical behavior, and leave generated files untouched.

## Scope

- Manually compare the final `templates/AGENTS.md` diff against the audit entry for `templates/AGENTS.md`.
- Manually compare any `src/shared/catalog.ts` diff against the audit entry for routing instructions.
- Confirm `templates/AGENTS.md` still contains pre-skill startup, safety, confirmation, routing, and workflow maintenance guidance.
- Confirm every removed or reduced global/routing instruction has audit-backed value rationale.
- Run relevant validation commands when practical.
- Do not update `templates/manifest.json`; manifest updates belong to the later metadata story.
- Do not edit generated managed files.

## Files

- `templates/AGENTS.md`
- `src/shared/catalog.ts`
- `src/shared/catalog.test.ts`
- `docs/features/workflow-prompt-compression/template_audit.md`
- `templates/manifest.json`
- `AGENTS.md`
- `.agents/**`

## Done when

- Manual review confirms `templates/AGENTS.md` remains clear enough for session startup, safety, confirmation, routing, and workflow maintenance.
- Manual review confirms routing still selects the smallest sufficient skill set without dropping necessary constraints.
- Every removed or reduced global/routing instruction is supported by `template_audit.md`.
- `git diff -- AGENTS.md .agents` shows generated workspace files were not edited.
- `git diff -- templates/manifest.json` shows manifest metadata was not edited in this story.
- Run `pnpm build` if `src/shared/catalog.ts` changed; run `node --test bin/shared/catalog.test.js` after build if routing text or catalog tests changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:54:44-06:00
