# Human-Directed Implementation Review Business Requirements Document

## Executive Summary and Business Need

Sibu currently allows specialist review findings to trigger unattended repair rounds before the engineer sees them. Those rounds can be slow and can give AI room to overcomplicate an otherwise focused story. For code-changing stories, this feature keeps independent architecture and technical-lead reviews but returns every completed review round to the engineer. The engineer decides whether to approve the current work, authorize specific changes, or defer it. AI never starts a repair solely because a reviewer reported a finding.

## Objectives and Measurable Success

- OBJ-01 — Keep implementation direction and scope under human control. Success means zero repair rounds start without an explicit human authorization tied to the reviewed snapshot and specific changes.
- OBJ-02 — Make specialist review useful without hiding its results or adding unattended review churn. Success means every completed pair of reviews is presented to the human before another repair or story progression, with both outcomes and unresolved findings visible.

Reducing time spent in review is a desired outcome, but this feature does not set or track a time target.

## Stakeholders and Needs

- **Engineer or team reviewing a story** needs timely, comprehensible specialist findings and authority to decide whether further changes are worth making.
- **Engineer responsible for shipping** needs accepted risks to remain visible, without a claim that specialists approved work they did not approve.
- **Sibu workflow maintainers** need a consistent review policy that prevents autonomous repair while preserving independent specialist assessment and final human control.

## Scope and Exclusions

**In scope:** Code-changing story implementations that currently receive architecture and technical-lead review; presentation of both outcomes after every review round; human approval, specific repair authorization, or deferral; re-review after authorized repairs; and preservation of unresolved findings accepted by the human.

**Out of scope:** Changes to the reviewers' distinct responsibilities or finding standards; automatic repair rounds or a preset repair-round cap; changes to documentation-only story review; automatic story approval, commit, or delivery continuation; and measuring review duration.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-02. After a code-changing story is implemented and validated, Sibu obtains independent architecture and technical-lead assessments of the same review snapshot, preferably in parallel when supported. (RULE-01)
- REQ-02 — Type: functional; Objectives: OBJ-01, OBJ-02. After both assessments finish, the main agent presents both reviewer outcomes, combined findings, validation evidence, and unresolved risks to the human and pauses for a decision, even when both reviewers approve. (RULE-02)
- REQ-03 — Type: functional; Objectives: OBJ-01. The human can approve the current snapshot as-is, authorize specific changes after discussion, or defer the story, regardless of finding severity. (RULE-03)
- REQ-04 — Type: functional; Objectives: OBJ-01. Only human-authorized changes may be handed to a fresh repair executor. The executor stays within the story and authorized scope, validates its changes, and triggers both specialist reviews of the resulting snapshot. (RULE-04, RULE-05)
- REQ-05 — Type: quality; Objectives: OBJ-01, OBJ-02. If the human approves despite unresolved findings, Sibu preserves those findings and the accepted-risk decision without presenting them as specialist approval. If the human defers, Sibu preserves the work and evidence without approving, committing, or continuing the story. (RULE-03, RULE-06)
- REQ-06 — Type: stakeholder; Objectives: OBJ-01. Conflicting reviewer recommendations or authoritative sources, and consequential product, architecture, dependency, data, security, privacy, migration, or scope choices, are presented for human judgment rather than resolved autonomously. (RULE-02, RULE-04)

## Business Rules

- RULE-01 — Both specialist outcomes in a review round must refer to the same unchanged implementation snapshot; reviewers remain independent and read-only.
- RULE-02 — Every completed review round returns to the human before any repair or story progression. Finding severity does not bypass this decision point.
- RULE-03 — The human has final story-level authority, including approval with unresolved blocking or major findings. Specialist findings inform but do not veto that decision.
- RULE-04 — No repair begins without explicit human authorization of specific changes for the current reviewed snapshot. Review findings alone are not authorization.
- RULE-05 — Any repair invalidates specialist outcomes for the prior snapshot and requires both reviewers to assess the new snapshot before the next human decision. There is no automatic repair loop or fixed limit on human-authorized rounds.
- RULE-06 — Specialist approval and human approval remain distinct. Human approval, rather than specialist approval alone, controls approval metadata, commit, and continuation.

## Business Acceptance Criteria

- AC-01 (REQ-01) — After a validated code-changing story, the human receives architecture and technical-lead outcomes that identify the same snapshot.
- AC-02 (REQ-02) — After either a clean or findings-bearing review round, no repair or story progression occurs before the main agent presents both outcomes and waits for the human.
- AC-03 (REQ-03) — The human can choose approval as-is, specific changes, or deferral even when a reviewer reports a blocking or major finding.
- AC-04 (REQ-04) — Reviewer findings without human authorization cause no repair. When changes are authorized, a fresh executor makes only those changes within the story, validates them, and both reviewers assess the new snapshot before another human decision.
- AC-05 (REQ-05) — Approval with unresolved findings retains the findings and accepted-risk decision without changing the recorded specialist outcomes; deferral leaves the story unapproved and uncommitted.
- AC-06 (REQ-06) — Conflicts and consequential choices are made visible for discussion rather than silently selected by AI.

## Product Vision Fit

This feature follows Sibu's small-work loop: use AI for focused implementation and independent quality review while keeping the engineer responsible for scope, judgment, and the decision to ship. It replaces unattended repair with visible human control rather than weakening review quality.

## Business Domain Model Fit

The feature follows the **Implementation Review Cycle**, **Review Snapshot**, **Review Packet**, **Repair Round**, and **Human Review Decision** in `docs/business-domain-model.md`. It preserves separate architecture and technical-lead reviews, snapshot-bound specialist outcomes, explicit repair authorization, and human acceptance of unresolved findings.

## Capability Coverage

Within the **AI-Augmented Development Pipeline** subdomain in `docs/capabilities-map.md`, this feature uses: **Determine specialist-review applicability**, **Establish a shared review snapshot**, **Coordinate specialist implementation review**, **Present every review round to the human**, **Support human-directed review decisions**, **Preserve accepted risks**, **Route authorized implementation repair**, **Surface material review choices**, and **Preserve human story approval**.
