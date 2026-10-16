# Step: Persist and read selected judge evidence safely

## Goal

Retain complete judge records under the existing local run artifacts and read only the selected rubric exchange and bounded field range.

## Scope

- Task ID: EFE-S02-T03; Milestone ID: EFE-S02-M2 (safe linked judge evidence); Status: done; Depends on: EFE-S02-T02.
- Story acceptance criteria: AC-01, AC-03, AC-04; source decisions: full source fields live in linked records, not compact manifests/attempt summaries/logs; publish complete references only after validated chunks; selected reads recheck safe path, regular-file identity, record ownership and limits; old artifacts remain valid and label absent judge fields `not-captured`. On-demand pointers: SDD `## Persistence, limits, and selected reads`, `## Failure behavior and operational safety`, `## Quality strategy and planned verification`; BRD REQ-04/06/07.
- Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- Extend existing `run-history` source record validation, reference, selected assembly and field extraction for completed judgments **and** grading-error captures. Keep selected rubric/reference context, request and any malformed response/rationale exact and distinct even when no score exists; do not synthesize a comparison for that state. Use opaque locators and UTF-8 byte lengths and reuse the existing Base64 byte-range continuation port and source safety checks. Invalid, cross-selection, missing, corrupt, runner-redacted or incomplete records yield typed gap/block; interrupted/over-limit capture never publishes a partial field as raw or a complete reference.
- Preserve atomic writes and effective Git-ignore/tracked-artifact safeguards. Do not broaden privacy policy or add a new storage module. If a touched source file approaches 500 lines, split by cohesive record-validation/read responsibility before the size gate.

## Files

- `src/modules/local-evals-workbench/run-history/contracts.ts`
- `src/modules/local-evals-workbench/run-history/validation.ts`
- `src/modules/local-evals-workbench/run-history/source-artifact.ts`
- `src/modules/local-evals-workbench/run-history/selected-source-evidence.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-store.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.test.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-store.test.ts`
- `src/modules/local-evals-workbench/run-history/artifact-safety-adapter.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/run-history/file-artifact-store.test.js bin/modules/local-evals-workbench/run-history/file-artifact-reader.test.js bin/modules/local-evals-workbench/run-history/artifact-safety-adapter.test.js`; pass: saved/reopened completed and grading-error judge records preserve exact available request/response bytes and check ownership, with absent grading-error score; old artifacts read with judge `not-captured`; interrupted/over-limit records expose gaps rather than partial raw fields or complete references; runner-reported redaction remains a typed gap on retrieval; corrupt/cross-selection records and unsafe ignored-versus-tracked paths are refused; large retained fields yield bounded byte ranges. Expected evidence: named passing persistence, compatibility, safety and continuation tests (SDD artifact-to-CLI preparation plus boundary methods; Story AC-01/03/04).
- Precommit check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: zero exit for T03 touched sources ≤500 lines; expected evidence recorded before commit.
- Complete links are the only exposed raw judge fields; no judge request/response leaks into manifest, ordinary run JSON or logs, and prior artifact reads remain valid.
