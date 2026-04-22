# Step: Update package metadata for npm publishing

## Goal
Make `package.json` publishable to npm with the minimum metadata and runtime packaging constraints required by the story and technical design, while keeping the current `sibu` CLI entrypoint shape intact.

## Scope
- Remove metadata that blocks npm publication.
- Add the publish-oriented package metadata required by the technical design.
- Add the Node 20+ support declaration through `engines.node`.
- Keep the existing `bin.sibu -> ./bin/sibu.js` mapping unless a blocking package-name issue is discovered.
- Do not implement runtime version checks, README user guidance changes, or maintainer release docs in this step.

## Files
- `package.json`

## Done when
- `package.json` no longer prevents npm publication.
- `package.json` includes the required npm publishing metadata from the technical design, including `engines.node: >=20`.
- The CLI binary declaration still points to the intended `sibu` executable.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-22T22:32:39Z
