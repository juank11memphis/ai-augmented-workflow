# Step: Document Shared Boundary Intent

## Goal

Add a small source-local note that explains why `src/shared` remains and what belongs there during the refactor, preventing future implementation steps from using `shared` as a generic dumping ground.

## Scope

- Add a concise Markdown note inside `src/shared/` describing that only universal primitives should remain there.
- Name the currently allowed shared primitives from the technical design: hash, object, paths, and types.
- State that product behavior from the Deep Module Map should move into the owning `src/modules/<deep-module-slug>/` folder in later stories.
- Do not move or edit existing shared TypeScript files in this step.
- Do not change tests, package configuration, or runtime code.

## Files

- `src/shared/README.md`

## Done when

- `src/shared/README.md` documents the intended shared boundary in a concise way.
- The note does not introduce new architecture decisions beyond the technical design.
- The source layout communicates that `src/shared` is temporary/limited, not a generic module owner.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T16:36:24-06:00
