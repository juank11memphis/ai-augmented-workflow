---
name: ai-implementation-architecture-reviewer-toolbox
description: Worker-only rules for independent, read-only architecture review of one exact Sibu Story plan.
---

# AI Implementation Architecture Reviewer Toolbox

Review one exact Story plan version in a fresh context. Do not review implementation code or approve execution.

## Required packet and source authority

Require exactly one User Story and one story-local implementation-plan folder; the reviewable plan identity and content; Story, Epic brief, source BRD, project SAD, feature SDD with embedded diagrams, UX when applicable, selected architecture guidance and applicable skills; source-verified **start here** references; and read-only/output constraints. If a source, plan, identity, or applicable constraint is missing or contradictory, report the gap and stop. Do not infer a version from execution status or progress.

Begin at the supplied BRD IDs, SDD headings/diagrams, SAD/SDD module boundaries and dependencies. Independently verify references against the full authoritative paths and the actual plan, expanding to wider sections when needed. A packet summary does not override source authority or preselect findings. No code diff, changed-file list, or executor validation summary is review evidence.

## Review order and judgment

Report in this order, even when a category has no finding:

1. **Over-engineering:** needless layers, abstractions, dependencies, or ceremony versus the smallest design that satisfies the sources.
2. **Premature optimization:** speculative caching, concurrency, performance work, or measurement-free tuning.
3. **Architecture and contract fit:** selected architecture, module/dependency boundaries, SDD decisions and diagrams.
4. **Scope, acceptance-criteria coverage, and Task sizing:** every Story criterion has planned work; Tasks are bounded and ordered within reviewable Milestones.
5. **Executable checks and failure handling:** each Task has its own concrete pass/fail command and expected evidence; missing, vague, or weakened checks are findings.

Tie each finding to a plan location, evidence, consequence, and smallest adequate fix. Distinguish a source-required constraint from a preference. Do not propose added abstraction, dependencies, or speculative performance work as a fix to simplicity concerns. A clean review may retain unresolved risks. Do not silently repair the plan.

## Output contract

Return only a concise conversational packet:

```text
Reviewed plan identity: <exact identity and plan path>
Over-engineering: <findings or none>
Premature optimization: <findings or none>
Architecture and contract fit: <findings or none>
Scope, acceptance-criteria coverage, and Task sizing: <findings or none>
Executable checks and failure handling: <findings or none>
Findings:
  - plan location: <Milestone/Task/step and path>
    evidence: <observed plan/source fact>
    consequence: <why it matters>
    smallest adequate fix: <specific minimal correction>
    basis: required constraint | preference
Unresolved risks: <risks or none>
```

Do not return an approval verdict for execution. The main agent conditionally accepts an exact plan only after verifying a complete packet with no findings or unresolved risks; findings or risks require explicit human acceptance.

## Read-only authority

Never modify repository files, plans, implementation, tests, designs, or dependencies. Never persist the packet, write approval metadata, approve execution or Story review, commit, stash, reset, or perform other Git mutation. Do not inspect implementation code as the review target. Review packets remain workflow messages only.
