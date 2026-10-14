# Step: Refine SDD direction into concrete Task checks

## Goal

Let the planner choose proportionate repository checks and evidence within the SDD strategy, while stopping when that strategy cannot be preserved.

## Scope

- Task ID: UCVP-02-T02; Milestone ID: UCVP-02-M01 (source-faithful Story and Task handoff); Status: checked; Depends on: UCVP-02-T01.
- Story acceptance criteria: UCVP-02 AC-02, AC-03; source decisions: `docs/features/user-controlled-verification-planning/brd.md` REQ-04/05/06 and AC-03/AC-04; `docs/features/user-controlled-verification-planning/sdd.md` §§ “Workflow design and ownership” (planner row), “Change classification and failure behavior”, “Quality strategy for this feature”. On-demand pointers: SDD “Main interaction and exception flow” sequence diagram; Story §§ “Verification Expectations”, “Validation”; `.agents/skills/ai-implementation-planner-toolbox/SKILL.md` §§ “Worker packet contract”, “Planning rules”, “Repository-aware validation policy”.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/typescript/SKILL.md`.
- Owning area: Sibu planner gatekeeper and worker-toolbox templates, not a new runtime operation. In the narrow packet, carry source-verified applicable SDD quality-strategy context and Story verification expectations, including method/coverage/evidence/human limits/exclusions. Require each planned Task check and final strategy to answer the same verification questions; allow exact repo command, fixture, equivalent local check, and more precise evidence without re-asking. Preserve existing ordered Milestone/Task plan format, source authority, repository-aware aggregate/package policy, and independent review handoff.
- State material-departure classification: an infeasible or insufficient method, non-equivalent substitution, uncovered strategic surface, material new method/cost/external dependency or human judgment stops affected planning, describes difference and smallest engineer decision, and requests engineer-directed SDD revision before changed plan/check. Missing relevant strategy or contradictory source blocks, not a guessed check. Do not turn ordinary unavailability with an equivalent in-scope check into a stop; do not mutate the SDD or add routine plan approval.
- Extend focused deterministic tests with representative handoff fixtures for exact-command/equivalent-check selection and material substitution, unavailable method without equivalent, new external cost/dependency, and new human judgment. Assertions inspect guidance and fixture mapping only, never call an LLM. Version both changed templates in `templates/manifest.json` with current user-facing notes.

## Files

- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-planner-toolbox/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-verification-plan.test.ts` (new focused deterministic contract/fixture test)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-verification-plan.test.js`; pass: both exit zero and named cases distinguish routine equivalent selection from material substitutions, unavailable no-equivalent methods, external expense/dependency, and human judgment; expected evidence: build result and focused TAP results with inspected fixture expectations.
- Packet and worker template pass enough source context for independent plan review; every planned Task keeps an executable pass/fail check and expected evidence. A focused semantic inspection records that material-stop wording does not broaden routine pauses or silently amend the SDD.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for touched TypeScript source; record actual result. Deeper property/fuzz and mutation are skipped as disproportionate; future agent interpretation remains a residual risk, not a unit-test claim.
