# Upfront Feature Decisions Epic Brief

**Epic ID:** FDH

## Summary
Make foreseeable feature-specific human decisions part of SDD discovery, then reuse their unchanged, explicitly approved scope during planned implementation so engineers are not asked twice.

## Source Context
- BRD: `../../brd.md` — Scope and Exclusions; REQ-01–REQ-07; AC-01–AC-05.
- Technical design: `../../sdd.md` — Ownership and boundaries; Feature Decision record and reuse contract; Main flow and failure paths; Quality strategy and planned verification.
- Domain and capabilities: `docs/business-domain-model.md` — Feature Decision and AI-Augmented Development Pipeline; `docs/capabilities-map.md` — Discover feature decision gates during SDD authoring, Record scoped feature approvals, Reuse approved feature decisions, Keep operational authority separate.
- UX: not applicable; the SDD specifies no UI impact.

## Scope
- Discover applicable downstream human gates during the SDD interview and finalize only after required decisions are explicitly approved and recorded with scope.
- Carry relevant decision references through planned Story work and let downstream skills reuse unchanged approval without a repeat question.
- Stop for missing or materially changed decisions while preserving independent eval authoring, operational permissions, and final Epic review.

## Out of Scope
- A new CLI approval service or ledger; blanket SDD sign-off; live-agent evals; human-judgment validation; independent eval-authoring changes beyond preserving its existing approval flow; automatic operational authorization or Epic merge.

## User Stories and Sequence
1. [FDH-01 — Capture scoped feature decisions during SDD discovery](./stories/01-capture-feature-decisions.md) — make the design-stage decision record complete and reviewable; none.
2. [FDH-02 — Reuse approved decisions in planned-feature work](./stories/02-reuse-approved-decisions.md) — carry and verify relevant approvals at downstream gates; depends on FDH-01.

## Feature Flags
- none.

## Acceptance Criteria
- A feature SDD records every known applicable, explicitly approved Feature Decision and does not finalize with a required answer missing.
- Planned-feature work reuses an unchanged relevant approval without asking again, while missing or changed decisions stop only the affected work.
- Independent eval authoring, operational permissions, and final human Epic review retain their own gates.

## Dependencies / Risks
- Prompt-owned guidance and distributed templates must remain aligned; deterministic contract checks cannot prove live-agent behavior. A new gate discovered after SDD completion remains a legitimate human stop.
