# Step: Verify remote checkpoint safety with deterministic fakes

## Goal

Exercise the checked-Task publication sequence and failure boundaries using fake Git, GitHub MCP, and PR-host responses, without adding production remote orchestration.

## Scope

- Task ID: GFW-S03-T02; Milestone ID: GFW-S03-M02; Status: done; Depends on: GFW-S03-T01
- Story acceptance criteria: AC-01, AC-02, AC-03; source decisions: `brd.md` REQ-04/REQ-05/REQ-08 and AC-03/AC-05; `sdd.md` §§ Publish a checked Task handoff, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence; on-demand pointers: `docs/features/github-feature-work-tracking/sdd.md` checked-Task sequence diagram and quality table; `docs/features/github-feature-work-tracking/ux.md` § Resume and hand off Story work; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`
- Owning area: template-catalog deterministic guidance/host-contract tests. Model operation traces with in-memory fake Git/MCP/PR hosts only; assert the written prompt contract alongside trace outcomes. Do not create a CLI command, runtime state machine, live GitHub fixture, or local feature-artifact cache.
- Cover failing prescribed check before commit/push; scoped commit and pushed remote hash matching completed Task in compact Story checklist and progress artifact with check evidence and next-work context; push rejection/timeout; issue checklist or artifact failure/timeout after push; readback-confirmed versus conflicting/unknown effects; changed accepted-plan fingerprint; and concurrent remote branch advance.
- Cover exactly one draft PR against the Epic branch after first push, including a one-Task Story; later checked Tasks reuse the same branch/PR without create duplication or continuation prompt. Failed or ambiguous draft-PR creation must stop after identifying confirmed effects; no merge, closure, or superseded-edit behavior belongs to this Story.

## Files

- `src/modules/template-catalog/templates-checked-task-handoff-contract.test.ts` (new)
- `templates/skills/ai-implementation-plan-executor/SKILL.md` (only for a contract gap exposed by focused tests)
- `templates/manifest.json` (if guidance changes)

## Done when

- Prerequisite build: `pnpm build` passes after the focused TypeScript test is added.
- Task check: `node --test bin/modules/template-catalog/templates-checked-task-handoff-contract.test.js`; pass: fake traces and guidance assertions cover every listed success, failure, stale-plan, and concurrency scenario and fail on a wrong sequence, mismatched hash, duplicate PR, or false handoff; expected evidence: named passing scenario assertions with trace/order and persisted fake-state comparisons.
- Each partial case reports confirmed and uncertain effects separately and does not mark a handoff or advance; ambiguous create/update effects are read back before any conditional retry, and conflict/unknown state stops. No force push or blind repeat is modeled.
- The fake tests establish deterministic contract behavior only, not live agent compliance, actual GitHub semantics, or cross-machine success. `node .agents/scripts/check-touched-source-file-lines.mjs` supplies touched-source size evidence; any changed template gets manifest-version/sync-note updates.
