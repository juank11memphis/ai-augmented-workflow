# Step: Preserve independent review and checked execution boundaries

## Goal

Make plan review and checked execution detect strategy drift without adding routine engineer approval or mislabeling ordinary failed checks.

## Scope

- Task ID: UCVP-02-T03; Milestone ID: UCVP-02-M02 (independently reviewed, evidence-honest execution); Status: checked; Depends on: UCVP-02-T02.
- Story acceptance criteria: UCVP-02 AC-02, AC-03, AC-04; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-04/05/06, AC-03/AC-04; `docs/features/user-controlled-verification-planning/sdd.md` §§ “Workflow design and ownership” (reviewer/executor rows), “Main interaction and exception flow” sequence diagram, “Change classification and failure behavior”, “Quality strategy for this feature”. On-demand pointers: Story §§ “Acceptance Criteria”, “Verification Expectations”; `.agents/skills/ai-implementation-plan-executor/SKILL.md` §§ “Required source context gate”, “Required sub-agent execution path”, “Review status”; `.agents/skills/ai-implementation-executor-toolbox/SKILL.md` §§ “Checked-Task mode”, “Execution rules”.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md` (operational workflow outcomes; do not add logging for prompt text alone).
- Owning area: independent plan-review toolbox, plan-executor gatekeeper, checked-Task executor toolbox templates. Require review of the exact Story plan against SDD methods/coverage/evidence/limits and Story expectations; omitted required method or unsupported substitution is an actionable finding when source-aligned repair is bounded, while an unresolved material strategy decision stops. Preserve fresh reviewer on changed plan, automatic clean-review acceptance and source-aligned repair, no routine human plan acceptance, and the existing Story-level review/control.
- Executor guidance must compare actual prescribed-check result and every `Done when` item against expected evidence. A failed prescribed check uses existing bounded failure/regression recovery; it is not itself strategy drift. Discovery of a materially infeasible/insufficient method or new cost, dependency, or human judgment stops affected changed work with the difference and engineer-directed SDD-revision request. Never silently replace a check or write SDD/approval metadata. Keep checked-Task scope, commit, and preserved-edit controls unchanged.
- Add deterministic cases for reviewer finding versus material-risk classification, clean automatic path, failed-check recovery versus strategy stop, and actual `Done when` evidence. Inspect prompt wording semantically for honest distinctions. Version changed templates with current user-facing sync notes.

## Files

- `templates/skills/ai-implementation-architecture-reviewer-toolbox/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ai-implementation-executor-toolbox/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-verification-review-execution.test.ts` (new focused deterministic contract/fixture test)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-verification-review-execution.test.js`; pass: both exit zero and cases assert source-aligned review repair, clean automatic progression, material stop, ordinary failed-check recovery, and prescribed-check plus `Done when` evidence; expected evidence: build result and focused TAP case results.
- Manual semantic comparison of changed passages with the sequence diagram records no new routine human plan gate, no silent SDD edits, no fabricated approval, and no claim that static tests prove agent conduct. Ambiguous material classification stops for source/engineer decision rather than a passing assertion.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for touched TypeScript source; record actual result. Property/fuzz, mutation, and load tests are skipped as disproportionate to guidance; residual interpretation risk remains for final Story review.
