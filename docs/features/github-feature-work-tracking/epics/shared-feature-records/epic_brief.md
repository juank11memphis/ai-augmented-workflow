# Shared Feature Records Epic Brief

**Epic ID:** GFW-E01

## Summary

Make GitHub the authoritative, usable home for planned Feature, Epic, and Story definitions before implementation begins. Engineers can define a feature once, read only the relevant published context, and see a clear stop when GitHub prerequisites are unavailable.

## Source Context

- BRD: `../../brd.md`, Scope, REQ-01–REQ-03, REQ-09, AC-01, AC-02, AC-06.
- Technical design: `../../sdd.md`, Ownership and Boundaries, Start and publish a feature stage, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capabilities: `docs/business-domain-model.md`, Feature-Work Tracking and Cross-Machine Handoff; `docs/capabilities-map.md`, AI-Augmented Development Pipeline capabilities **Require GitHub readiness for feature work**, **Place feature artifacts in GitHub**, **Organize GitHub feature work**, **Publish stage-complete documents**, and **Read GitHub artifacts selectively**.
- UX: `../../ux.md`, Start planned feature work, Publish feature documents, and binding compact/medium/wide terminal mockups.

## Scope

- Require the project's GitHub repository and usable GitHub MCP before the first planned feature artifact; leave local setup, maintenance, and narrow fixes available.
- Publish BRD, UX, and SDD stage-complete artifacts to one Feature issue and read only relevant published context through MCP.
- Create native Epic and Story sub-issues, keep their definitions in GitHub, and hold Story plan/progress artifacts without duplicate local feature-planning files.

## Out of Scope

- Checked-Task commits, draft Story PRs, cross-machine Task reconciliation, issue closure, local-only mode, migration, GitHub Projects, and native PR-to-issue linking.

## User Stories and Sequence

1. [GFW-S01 Publish authoritative feature documents](./stories/01-publish-authoritative-feature-documents.md) — working GitHub-readiness and Feature-document flow; none.
2. [GFW-S02 Plan Epics and Stories in GitHub](./stories/02-plan-epics-and-stories-in-github.md) — native hierarchy and Story planning artifacts; depends on GFW-S01.

## Feature Flags

- none

## Acceptance Criteria

- Planned feature work stops before creating an artifact when the repository remote or required MCP capability is unavailable, while local Sibu setup and maintenance still work (BRD REQ-01).
- A ready feature has one Feature issue with published BRD, UX, and SDD artifacts; its Epics and Stories form native sub-issues, and Story plans/progress use issue artifacts without on-disk duplicates (BRD REQ-02, REQ-03, REQ-09).
- Routine success and blocker messages follow the binding terminal mockups, including distinct missing-remote and missing-MCP next steps (BRD REQ-01, REQ-03).

## Dependencies / Risks

- GitHub issue artifacts are an external preview capability; unavailable operations must stop the affected stage rather than create local substitutes.
- Sibu template changes require manifest versions, user-facing sync notes, and deterministic lifecycle coverage. Static guidance tests do not prove live MCP or agent behavior; the SDD records that verification gap.
