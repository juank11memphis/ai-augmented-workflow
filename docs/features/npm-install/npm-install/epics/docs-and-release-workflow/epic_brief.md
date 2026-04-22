# Docs and Release Workflow Epic Brief

## Summary
Document the canonical user install/update path and the maintainer release workflow so Sibu can be adopted and published without tribal knowledge.

## Source Context
- Feature brief: `docs/features/npm-install/npm-install/feature_brief.md`
- Technical design: `docs/features/npm-install/npm-install/technical_design.md`

## Scope
- End-user README install/update guidance.
- Maintainer release documentation for npm publication.
- Release notes/changelog expectations and where they live.

## Out of Scope
- Packaging/runtime code changes.
- Runtime npm version lookup logic in `sibu doctor` except where docs must explain the flow.
- Alternate distribution channels.

## User Stories
- [Document the canonical npm install and update flow for users](./stories/01-document-canonical-npm-install-and-update-flow.md)
- [Document the maintainer npm release workflow](./stories/02-document-maintainer-npm-release-workflow.md)
- [Define the release notes and changelog expectation](./stories/02-define-release-notes-and-changelog-expectation.md)

## Acceptance Criteria
- User-facing docs show one canonical npm install/update path.
- Maintainers have one documented npm release path.
- The repo clearly states that every release updates both `CHANGELOG.md` and the matching GitHub Release.

## Dependencies / Risks
- The final package name must be chosen during implementation; release notes are required in both `CHANGELOG.md` and GitHub Releases.
