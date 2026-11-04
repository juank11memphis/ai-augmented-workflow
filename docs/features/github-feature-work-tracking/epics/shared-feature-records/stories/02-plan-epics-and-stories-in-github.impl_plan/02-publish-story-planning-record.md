# Step: Publish the exact Story planning record

## Goal

Make the Story issue hold compact ordered Task status while the exact accepted implementation plan and concise progress live as confirmed Story issue artifacts.

## Scope

- Task ID: GFW-S02-T02; Milestone ID: GFW-S02-M01 (navigable GitHub planning hierarchy); Status: done; Depends on: GFW-S02-T01.
- Story acceptance criteria: AC-02; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-02/AC-02, `docs/features/github-feature-work-tracking/sdd.md` Start and publish a feature stage, State, Safety, and Operational Visibility, and Quality Strategy and Planned Evidence require issue-body checklist versus exact plan/progress artifact ownership; changed plan content needs fresh independent review before Task execution. On-demand pointers: `docs/business-domain-model.md` Story Implementation Plan and Plan Review Cycle; `docs/features/github-feature-work-tracking/ux.md` Resume and hand off Story work. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- In prompt-owned planner, planner-worker, executor gatekeeper, and independent architecture-reviewer toolbox templates, define the Story issue as the compact ordered Task checklist and its artifacts as the exact reviewable plan and concise append-only progress. Adapt the reviewer handoff to accept exact GitHub Story, plan-artifact, and authoritative source issue/artifact identities with transient source and plan content plus a stable content fingerprint, rather than requiring a local Story-plan folder or local feature-source files. Preserve the reviewer's independent read-only authority, source verification, changed-plan re-review, stable Task IDs, Milestones, checks, Done-when evidence, statuses, dependency ordering, and Task-commit/PR authority; do not weaken review gates.
- Publish only after identifying repository, Story issue, and artifact identity; confirm content/identity before calling the plan durable or starting Task execution. No separate local plan/progress output in the target workflow and no detailed per-Task log in the issue body. Current story-local plan files remain the prescribed output of this planning run, not an implementation target.
- Do not implement checked-Task execution, push/PR publication, or cross-machine reconciliation; GFW-S03 owns those behaviors. Preserve the existing executor's stop at unsupported later checkpoints.

## Files

- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-planner-toolbox/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md` (planning/review gate only)
- `templates/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md` (artifact-only review packet and read-only source verification)
- `templates/manifest.json`
- `src/modules/template-catalog/templates-feature-story-planning-record.test.ts` (new focused test)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-feature-story-planning-record.test.js`; pass: both exit 0 and deterministic fake-MCP cases assert correct Story issue/artifact identities, compact ordered checklist, exact accepted-plan content/fingerprint, concise progress, no duplicate local plan/progress files, and refusal to execute an unpublished or changed/unreviewed plan; cross-template assertions show an artifact-only packet reaches the independent reviewer with exact GitHub Story/plan/source identities and transient content, without a local plan folder or feature-source files. Expected evidence: named passing cases, correct issue/artifact IDs and call trace, stable fingerprint at reviewer dispatch, no local-write trace, and preserved read-only/source-verification/changed-plan-review stops. This answers SDD hierarchy/publication and exact-plan safety methods; static guidance checks alone do not prove an agent follows them.
- A changed plan artifact invalidates prior review while status/progress-only updates do not. Existing Task commit, PR, and review gates remain intact, not activated or relaxed by this Task.
- Changed managed templates have global/per-file manifest version bumps and user-facing current-version sync notes; touched source test files remain at or below 500 lines.
