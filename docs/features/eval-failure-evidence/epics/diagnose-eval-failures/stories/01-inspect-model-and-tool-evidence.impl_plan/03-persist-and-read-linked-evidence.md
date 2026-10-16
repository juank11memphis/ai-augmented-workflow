# Step: Persist and read linked source records safely

## Goal

Retain complete source evidence outside compact manifests and expose safe selected records and bounded field ranges through the existing artifact adapter.

## Scope

- Task ID: EFE-S01-T03; Milestone ID: EFE-S01-M2 (safe, durable selected records); Status: pending; Depends on: EFE-S01-T02
- Story acceptance criteria: AC-02, AC-03, AC-04; source decisions: linked records beneath ignored `evals/artifacts/`, complete-record publication only, atomic writes, manifest/attempt summaries remain bounded, regular-file and path/identity/limit checks on every read; on-demand pointers: `docs/features/eval-failure-evidence/sdd.md` `## Persistence, limits, and selected reads`, `## Failure behavior and operational safety`; `docs/features/eval-failure-evidence/brd.md` REQ-03/06/07; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Implement store/reader port methods and adapters for linked complete records and byte ranges, carrying exact case/attempt/turn/check identity and ordering. Reuse existing safety, atomic-file and Git-ignore/tracked-artifact mechanisms. Opaque field locators must never be caller-supplied paths.
- Keep source payloads out of manifest, normal run JSON and safe operational logs. Old attempt artifacts remain readable with `not-captured`; corrupt/missing/incomplete records produce typed gaps or explicit errors, not partial raw content. Recheck selected assertion ownership on continuation.

## Files

- `src/modules/local-evals-workbench/run-history/contracts.ts`
- `src/modules/local-evals-workbench/run-history/validation.ts`
- `src/modules/local-evals-workbench/run-history/limits.ts`
- `src/modules/local-evals-workbench/run-history/artifact-paths.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-store.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-store.test.ts`
- `src/modules/local-evals-workbench/run-history/file-artifact-reader.test.ts`
- `src/modules/local-evals-workbench/run-history/artifact-safety-adapter.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/local-evals-workbench/run-history/file-artifact-store.test.js bin/modules/local-evals-workbench/run-history/file-artifact-reader.test.js bin/modules/local-evals-workbench/run-history/artifact-safety-adapter.test.js`; pass: disposable-store tests reopen exact linked records, reconstruct large UTF-8 fields from ranges, reject unsafe/tracked/nonignored/corrupt/cross-selection reads, and report incomplete capture honestly; expected evidence: named persistence, boundary and safety tests with disposable fixtures.
- Pre-commit source-size check: `node .agents/scripts/check-touched-source-file-lines.mjs`; pass: all source files touched by T03 are at most 500 lines; expected evidence: recorded zero exit before T03 commit, with cohesive splitting if needed.
- Existing manifest and attempt summaries remain compact, and failure to retain complete evidence creates an explicit capture gap without a shortened value labeled raw (Story AC-03/04; BRD REQ-06/07).
- Existing effective Git-ignore, tracked-artifact, symlink/hard-link, regular-file, identity and size protections remain in force for new record paths and reads (Story AC-04; BRD AC-05).
