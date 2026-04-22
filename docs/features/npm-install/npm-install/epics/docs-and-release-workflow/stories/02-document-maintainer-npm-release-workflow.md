# Document the maintainer npm release workflow

## Epic
[Docs and Release Workflow](../epic_brief.md)

## User Story
As a Sibu maintainer, I want one documented npm release workflow, so that I can publish new versions without relying on tribal knowledge.

## Context
The feature brief and technical design explicitly include maintainer-facing release documentation as part of the end-to-end feature outcome.

## Scope
- Create or update maintainer release documentation.
- Cover npm registry prerequisites, auth/access, version bumping, the Node 20+ support baseline, `CHANGELOG.md` updates, GitHub Release creation, pack/publish, and post-publish verification.
- Keep README focused on end-user install/update and place maintainer steps in the dedicated maintainer doc.

## Out of Scope
- Implementing package/runtime code changes themselves.
- Writing the release notes content for a specific release.

## Acceptance Criteria
- The repo contains one maintainer release document for npm publication.
- The documented flow includes npm auth/access prerequisites, version bumping, `CHANGELOG.md` updates, GitHub Release creation, validation, publishing, and verification.
- The document is clear enough for a maintainer to follow without additional oral context.

## Validation
- Review the maintainer document against the technical design release flow.
- Confirm it covers the end-to-end release steps in order.
- Confirm the documented release flow includes tarball-based validation from `npm pack` output, not only repo-local testing.
