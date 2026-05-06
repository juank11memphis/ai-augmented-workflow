# Step: Keep packaged runtime aware of modules

## Goal

Ensure moving runtime state behavior under `src/modules/` does not break the compiled or packed CLI runtime.

## Scope

- Update package runtime file inclusion if needed so compiled `bin/modules/` files are included when the package is packed.
- Keep `bin/shared/` packaged while shared runtime primitives such as `hash.ts`, `paths.ts`, `types.ts`, or catalog constants are still compiled there.
- Do not remove `bin/features/` from package contents in this story because command handlers still live under `src/features/`.
- Do not change command names, admin scripts, or release scripts unless a validation failure proves this state move requires it.

## Files

- `package.json`
- `scripts/validate-packed-cli-runtime.mjs`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/workflow-state-registry/state.ts`

## Done when

- `package.json` includes `bin/modules/` if runtime code now imports compiled module files.
- Existing package inclusions still cover remaining runtime entrypoints and shared primitives.
- `pnpm run validate:packed-runtime` passes after `pnpm build`.
- Packed-runtime validation still protects installed CLI behavior after the state registry move.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:38:57.176Z
