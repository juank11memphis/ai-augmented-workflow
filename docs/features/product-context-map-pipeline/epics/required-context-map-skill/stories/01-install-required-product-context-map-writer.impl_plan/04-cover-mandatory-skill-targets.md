# Step: Cover mandatory skill targets with tests

## Goal

Add focused test coverage proving the required skill is included in workflow targets while the generated Product Context Map remains unmanaged.

## Scope

- Update workflow target tests to assert `.agents/skills/product-context-map-writer/SKILL.md` appears with mandatory skills.
- Add or update assertions that `docs/product-context-map.md` is not included as a workflow target.
- Keep tests focused on this story’s scope: mandatory skill installation, not downstream skill consumption.
- If build output tests run against `bin/**`, rely on `pnpm build` to regenerate compiled test files.

## Files

- `src/shared/workflow-targets.test.ts`
- `bin/shared/workflow-targets.test.js`

## Done when

- Workflow target tests cover mandatory inclusion of `.agents/skills/product-context-map-writer/SKILL.md`.
- Workflow target tests cover that `docs/product-context-map.md` is not a managed target.
- The story acceptance criteria for mandatory catalog and workflow target inclusion are covered by tests.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T12:57:14-06:00
