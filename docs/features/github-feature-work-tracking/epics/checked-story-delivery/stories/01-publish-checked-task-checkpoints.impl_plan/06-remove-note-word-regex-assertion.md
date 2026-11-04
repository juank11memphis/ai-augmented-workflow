# Step: Remove the stale note-word regex assertion

## Goal

Restore the focused lifecycle check by removing only its stale sync-note wording assertion while retaining manifest/version consistency, healthy doctor, fake sync/customization behavior, and local independence coverage.

## Scope

- Task ID: GFW-S03-T06; Milestone ID: GFW-S03-M06; Status: done; Depends on: GFW-S03-T05
- Story acceptance criteria: AC-02, AC-03, AC-04 (retained lifecycle behavior continues to establish Story status, handoff-related template distribution, and truthful current state); source requirements: BRD REQ-04, REQ-05, REQ-08, AC-03, AC-05; SDD §§ Publish a checked Task handoff, State, Safety, and Operational Visibility, Quality Strategy and Planned Evidence require truthful confirmed/uncertain outcomes and deterministic test evidence; UX § Resume and hand off Story work and the binding compact/medium/wide handoff and partial-publication states; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Owning area: `src/modules/template-catalog/templates-feature-planning-lifecycle.test.ts` only. In the `fake init and doctor install current planning handoff guidance without a GitHub gate` case, remove only `assert.match(manifest.templates[template]?.changes.join(' ') ?? '', /confirmed|unconfirmed/);`; it pins note vocabulary rather than behavior, and fails against the current executor-template note using “partial publication.”
- Do not remove the test case/file or alter any other assertion. Retain installed-byte equality, installed manifest-version equality, healthy doctor, fake sync update and customization protection, and absence of a GitHub dependency. Add no replacement wording/version pin. Do not edit templates, manifest, production code, or prior Task evidence. This is the bounded same-Story regression identified after T05; no uncommitted implementation edits were reported.
- Final Story validation remains `pnpm verify`, `node .agents/scripts/check-touched-source-file-lines.mjs`, and `pnpm run validate:packed-runtime` after changes stabilize; it is not substituted by this focused Task check.

## Files

- `src/modules/template-catalog/templates-feature-planning-lifecycle.test.ts`

## Done when

- Prerequisite build: `pnpm build` passes so the focused compiled test reflects the source edit.
- Task check: `node --test bin/modules/template-catalog/templates-feature-planning-lifecycle.test.js`; pass: both lifecycle tests pass (2/2); expected evidence: the former vocabulary-only assertion is absent and the two cases retain and pass their lifecycle assertions.
- `node .agents/scripts/check-touched-source-file-lines.mjs` passes for the touched TypeScript test; expected evidence: the file is at or below 500 lines.
- Deterministic local fake lifecycle tests establish template installation, doctor health, and sync/customization behavior only; they do not prove live agent behavior, GitHub semantics, or subjective UX fidelity. Keep the SDD's excluded live GitHub, disposable-repository, live-model, and separate human QA checks out of this Task.
