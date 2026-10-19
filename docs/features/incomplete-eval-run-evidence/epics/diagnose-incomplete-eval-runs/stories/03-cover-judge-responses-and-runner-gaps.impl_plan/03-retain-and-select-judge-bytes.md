# Step: Retain and select bounded judge evidence

## Goal

Carry judge role and check identity through Git-excluded artifacts to the existing selected `evals result` path, with exact bounded bytes and honest gaps.

## Scope

- Task ID: IERE-S03-T03; Milestone ID: IERE-S03-M02 (inspectable incident evidence); Status: completed; Depends on: IERE-S03-T02.
- Story acceptance criteria: AC-01, AC-02; source decisions: `docs/features/incomplete-eval-run-evidence/brd.md` REQ-01–REQ-06 and AC-01–AC-03; on-demand pointers: `docs/features/incomplete-eval-run-evidence/sdd.md` §§ Execution and evidence boundaries, State, limits, and inspection, Quality strategy — planned, not yet run; applicable skills: `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owner: Local Evals Workbench run-history store/reader adapters and headless-eval-result command/result/handler. Preserve role/check identity in durable references and selected incomplete-attempt overview; return a judge locator only after a successful write. Reuse the existing `--case`/`--attempt` and selected `--field` byte-range read, not a new API or assertion requirement. Keep v1/v2 absence as `not-captured`; do not synthesize a v2 judge exchange, score, or complete judgment from raw judge bytes.
- Verify root containment, Git exclusion, artifact identity, byte ceilings, truncation/missing extent, zero/partial write failure, binary/UTF-8 ranges and `nextOffset`, bounded selected JSON, and body-free unselected/selected-overview output. Reuse S02 artifact policy rather than add a separate judge store. Handle any already-near-500 touched source file by cohesive split before final source-size gate.

## Files

- `src/modules/local-evals-workbench/run-history/provider-response-artifact.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-store.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.ts`
- `src/modules/local-evals-workbench/run-history/validation.ts`
- `src/modules/local-evals-workbench/run-history/judge-response-artifact.test.ts` (new)
- `src/modules/local-evals-workbench/headless-eval-result/result.ts`
- `src/modules/local-evals-workbench/headless-eval-result/handler.ts`
- `src/modules/local-evals-workbench/headless-eval-result/judge-response.test.ts` (new)

## Done when

- Task check: `pnpm build`; pass: artifact and selected-result contracts compile; expected evidence: exit 0.
- Task check: `node --test bin/modules/local-evals-workbench/run-history/judge-response-artifact.test.js bin/modules/local-evals-workbench/run-history/provider-response-artifact.test.js bin/modules/local-evals-workbench/run-history/bounded-artifact-reader.test.js bin/modules/local-evals-workbench/headless-eval-result/judge-response.test.js bin/modules/local-evals-workbench/headless-eval-result/provider-response.test.js`; pass: named contract/unit cases prove durable judge role/check links, safe path/Git exclusion, hard caps and honest missing extent, selected exact byte ranges and continuation, v1/v2 not-captured regression, and sentinel absence from ordinary JSON; expected evidence: passing test names, references, and decoded range assertions.
- A failed or interrupted write never yields an available locator; a checkpointed Sibu write failure is `not-persisted`, not runner-side `capture-failed`. Selected results expose the precise observable gap. Routine output and logs omit raw bodies, credentials, secrets, and hidden reasoning; raw bytes appear only in explicit bounded field reads.
- Evidence class: artifact contract, selected-result unit, edge/failure, compatibility and safety regression. T04 proves runner-to-CLI behavior; human review judges whether any conclusion outruns observations.
