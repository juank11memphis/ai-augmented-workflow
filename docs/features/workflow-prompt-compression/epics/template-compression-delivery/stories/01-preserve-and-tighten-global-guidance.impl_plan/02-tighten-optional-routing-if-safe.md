# Step: Tighten optional routing if safe

## Goal

Review optional skill routing strings in `src/shared/catalog.ts` against the audit and apply only safe wording reductions that preserve routing semantics and minimum-sufficient-skill selection.

## Scope

- Review `src/shared/catalog.ts` routing instructions against the `src/shared/catalog.ts` entry in `template_audit.md`.
- Apply light wording compression only where the audit supports it and where all task classes and skill-selection semantics remain covered.
- Preserve routing semantics for TypeScript, Go, React, Next.js, DDD/hexagonal, Command Pattern, AI Prompt Engineer Master, and UX Expert.
- If no routing string can be safely reduced without weakening correct skill selection, leave `src/shared/catalog.ts` unchanged and document that decision in the final step report.
- Update `src/shared/catalog.test.ts` only if an existing test must change due to a deliberate routing text change.
- Do not remove any skill dependency that protects quality.
- Do not edit generated `AGENTS.md`, `.agents/**`, skill templates, or `templates/manifest.json` in this step.

## Files

- `src/shared/catalog.ts`
- `src/shared/catalog.test.ts`
- `docs/features/workflow-prompt-compression/template_audit.md`

## Done when

- Routing still clearly selects the smallest sufficient skill set without dropping necessary constraints.
- Every changed routing instruction is backed by the audit and does not change semantics unless the audit explicitly justifies that semantic change.
- If `src/shared/catalog.ts` changes, `pnpm build` and `node --test bin/shared/catalog.test.js` pass after building, or the failure is reported with cause.
- If `src/shared/catalog.ts` does not change, the reason is that the audit-supported candidates were not safe enough to reduce in this story.
- Generated workspace files and `templates/manifest.json` remain unchanged.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:53:33-06:00
