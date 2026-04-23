# Step: Document the npm release flow end to end

## Goal
Document one complete maintainer release path for Sibu using standard npm workflows.

## Scope
- Cover the maintainer release steps in order.
- Include npm registry prerequisites and access/auth expectations.
- Include the Node 20+ baseline, version bumping, `CHANGELOG.md`, tarball-based validation, `npm publish`, GitHub Release creation, and post-publish verification.
- Keep the flow practical and explicit rather than abstract.
- Do not add automation or CI requirements in this step.

## Files
- maintainer release document file
- `docs/features/npm-install/npm-install/technical_design.md` only if wording must be tightened for consistency

## Done when
- A maintainer can follow the documented release flow from preparation through post-publish verification.
- The doc includes `npm pack`-based validation rather than relying only on repo-local or link-based testing.
- The doc clearly says to update `CHANGELOG.md` first and then create the matching GitHub Release from that same summary.

## Review status
- Approved by: `juanca`
- Approved at: `2026-04-23T02:26:08Z`
