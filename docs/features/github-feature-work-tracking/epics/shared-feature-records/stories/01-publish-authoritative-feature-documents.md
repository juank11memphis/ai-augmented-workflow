# Publish Authoritative Feature Documents

**Story ID:** GFW-S01

## Epic

[Shared Feature Records](../epic_brief.md)

**Status:** ready-for-planning

## User Story

As an engineer, I want planned feature documents published on one GitHub Feature issue, so that the next engineer or agent reads the same authoritative feature decisions.

## Context and Source Traceability

- BRD: `../../../brd.md`, Scope, REQ-01, REQ-03, REQ-09, AC-01, AC-06.
- SDD: `../../../sdd.md`, Ownership and Boundaries, Start and publish a feature stage, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence.
- Domain and capability: `docs/business-domain-model.md`, Feature Issue, Feature Artifact Published, and Feature-Work Tracking and Cross-Machine Handoff; `docs/capabilities-map.md`, **Require GitHub readiness for feature work**, **Place feature artifacts in GitHub**, **Publish stage-complete documents**, and **Read GitHub artifacts selectively**.
- UX: `../../../ux.md`, Start planned feature work, Publish feature documents, and binding missing-remote, missing-MCP, Feature-created, publication-success, publication-unconfirmed, and wide blocked mockups.

## In Scope

- Gate the first planned feature artifact on a GitHub repository remote and usable GitHub MCP issue, sub-issue, and artifact capabilities; distinguish missing remote from missing MCP.
- Create or find one Feature issue and publish BRD, UX, and SDD artifacts at their stage boundaries; read only relevant published prerequisites into session context.
- Stop on missing access, unavailable artifacts, or ambiguous publication; read back uncertain effects before retrying. Keep `sibu init`, `doctor`, `sync`, and narrow fixes independent of GitHub.
- Do not create an on-disk feature-artifact cache or a local substitute for a blocked feature stage.

## Out of Scope

- Epic/Story issue hierarchy, Story plan/progress publication, checked Tasks, PR lifecycle, migration, and local-only planned-feature mode.

## Acceptance Criteria

- **AC-01 — Readiness before artifact:** With no GitHub remote or required MCP capability, feature work creates no Feature issue or artifact, gives the specific next step, and leaves local setup, maintenance, and narrow fixes available (BRD REQ-01). Verification: test.
- **AC-02 — Stage publication:** A ready feature has one Feature issue, and each completed BRD, UX, and SDD stage publishes its authoritative artifact before downstream work reads it (BRD REQ-03). Verification: test.
- **AC-03 — Selective context:** A new stage reads only needed published feature artifacts through MCP into session context, creates no on-disk feature cache, and does not treat an interrupted unpublished draft as complete (BRD REQ-09). Verification: test.
- **AC-04 — Honest uncertainty:** An ambiguous create or update is read back before retry; unconfirmed publication pauses downstream work rather than claiming a checkpoint or making a duplicate (BRD REQ-01, REQ-03). Verification: test.
- **AC-05 — Terminal states:** Compact and wide missing-remote, missing-MCP, Feature-created, publication-success, and publication-unconfirmed output preserve the UX wording, hierarchy, and next action (BRD REQ-01, REQ-03). Verification: visual comparison.

## Verification Expectations

- Deterministic fake-Git/MCP and guidance/entrypoint scenarios demonstrate readiness, local independence, stage publication, selective reads, missing capabilities, and uncertain-effect readback. Static prompt-contract checks confirm stated guidance only, not live agent compliance.
- Output assertions cover the affected terminal states and accessible linear wording. A person compares these states with the binding UX mockups during the existing final Epic PR review, not a separate QA gate.
- No live GitHub, disposable-repository integration, or live-model eval is required. The SDD's actual-MCP evidence gap remains visible.

## Validation

- Focused deterministic tests for changed guidance and affected CLI outputs, followed by `pnpm verify` after changes stabilize.
- Applicable Sibu template-manifest and sync lifecycle checks with fakes.

## Domain Context

Primary bounded context: AI-Augmented Development Pipeline. Feature Issue and Feature Artifact Published supply the durable stage checkpoint; GitHub MCP remains an external capability.

## Technical Context

Prompt-owned pipeline and skill guidance use the SDD's readiness and publication contracts. `agent-tool-configuration` renders safe MCP configuration but does not prove access; installer, health, and sync stay local. No new Deep Module or CLI delivery engine.

## UX References

`../../../ux.md`, Start planned feature work, Publish feature documents, binding compact readiness/publication mockups and wide blocked mockup.

## Non-Functional Criteria

Credentials and full private artifacts remain out of logs; feature work stops rather than claiming publication from ambiguous external effects (BRD REQ-01, REQ-09).

## Deployability and Feature Flag

**Behind flag:** no. This is a complete feature-document authoring path; unimplemented downstream Epic/Story planning must still stop at its own missing GitHub capability rather than write a local feature substitute.

## Dependencies

Depends on: none. Blocks: GFW-S02.

## Open Questions and Assumptions

none
