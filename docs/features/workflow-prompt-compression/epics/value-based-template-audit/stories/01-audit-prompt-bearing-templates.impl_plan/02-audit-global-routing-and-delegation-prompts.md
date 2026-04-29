# Step: Audit global, routing, and delegation prompts

## Goal

Populate the audit for global instructions, routing instructions, and delegation shims so maintainers can see which pre-skill prompt content must stay, which can be tightened, and which should be deferred.

## Scope

- Audit `templates/AGENTS.md` as the global pre-skill safety, routing, confirmation, communication, and workflow maintenance surface.
- Audit optional routing instructions in `src/shared/catalog.ts` for minimum-sufficient-skill routing clarity.
- Audit `templates/CLAUDE.md`, `templates/GEMINI.md`, and `templates/.codex/config.toml` only for meaningful prompt text beyond delegation or agent setup.
- For each audited source, record current role, categories found, recommended action, value rationale, quality risk, and prerequisite/context-loading assessment.
- Mark uncertain reductions as keep or defer, not remove.
- Do not apply any recommendation to source files in this step.

## Files

- `docs/features/workflow-prompt-compression/template_audit.md`
- `templates/AGENTS.md`
- `src/shared/catalog.ts`
- `templates/CLAUDE.md`
- `templates/GEMINI.md`
- `templates/.codex/config.toml`

## Done when

- `template_audit.md` includes completed audit entries for global guidance, routing instructions, and delegation shims.
- Any compress, move, or remove recommendation explains why the current wording adds no meaningful behavioral, safety, output-quality, or maintainability value in its current form or belongs elsewhere.
- Safety, user-control, confirmation, routing, and workflow-maintenance guidance is not recommended for removal unless the audit clearly proves no meaningful value is lost.
- Validation confirms no recommendation is based solely on token count, prompt length, or brevity.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:41:56-06:00
