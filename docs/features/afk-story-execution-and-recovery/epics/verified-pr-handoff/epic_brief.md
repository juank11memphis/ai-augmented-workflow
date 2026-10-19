# Verified PR Handoff Epic Brief

**Epic ID:** AFK-PR

## Summary
Make Story integration depend on verified source-control facts and leave a truthful Story/Epic PR record for the engineer's final Epic review.

## Source Context
- BRD: `../../brd.md` — REQ-07–REQ-08, AC-04–AC-05, RULE-05–RULE-06.
- Technical design: `../../sdd.md` — Story and Epic PR handoff; Quality strategy and planned verification.
- Domain and capabilities: `docs/business-domain-model.md` — Story Pull Request and Epic Pull Request; `docs/capabilities-map.md` — Verify Story PR handoff facts, Stop unsafe integration, Present a consolidated Epic PR.
- UX: not applicable; the SDD specifies no UI impact.

## Scope
- Verified Story PR required checks and merge policy, MCP-first host fact access with narrow read-only fallback, and safe readback after ambiguous effects.
- Story/Epic PR summaries of noteworthy recovery and validation, known Epic handoff policy facts, and removal of stale separate-QA gates.

## Out of Scope
- Automatic Epic merge, external host policy changes, separate behavioral QA, live GitHub integration in unit tests, and production deployment.

## User Stories and Sequence
1. [AFK-PR-01 — Verify and report Story/Epic PR handoffs](./stories/01-verify-pr-handoffs.md) — complete safe integration and final human handoff; none.

## Feature Flags
- none.

## Acceptance Criteria
- Story merge requires current required-check and merge-policy facts from the host, checked Story evidence, and safe local/remote state; unavailable or ambiguous facts block it.
- Story and Epic PR summaries expose relevant failures, reviewed repairs, actual checks, and stops; the Epic PR reports known host facts and remains for human review.
- Stale separate behavioral-QA merge gates are absent without removing planned Task/Story checks.

## Dependencies / Risks
- External GitHub MCP capability can vary; narrow read-only host fallback may require approval. Recovery details are included when available, without requiring the separate recovery Epic to be merged first.
