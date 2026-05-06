# Step: Remove shared prompt wrapper

## Goal

Remove the temporary shared prompt compatibility wrapper after all consumers use Interactive Guidance directly.

## Scope

- Delete `src/shared/prompts.tsx` after confirming no source imports reference it.
- Remove stale compiled shared prompt outputs before broad test discovery when needed.
- Keep `src/modules/interactive-guidance/prompts.tsx` and its exports as the only prompt helper implementation and public module entrypoint.
- Do not remove other shared primitives such as paths, hash, object, catalog, or types.

## Files

- `src/shared/prompts.tsx`
- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`
- `package.json`

## Done when

- `src/shared/prompts.tsx` is removed.
- No source imports reference `shared/prompts`.
- Interactive Guidance remains the only owner of prompt UI helpers.
- `pnpm build` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:28:10-06:00
