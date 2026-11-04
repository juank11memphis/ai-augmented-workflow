# Step: Restore executable packed guided-eval validation

## Goal

Remove pre-existing brittle exact-prose assertions from the installed-package guided-eval validator while retaining its executable package-presence and mandatory Codex/Claude catalog-route checks, so the blocked packed-runtime check can pass before T07 resumes.

## Scope

- Task ID: GFW-S03-T08; Milestone ID: GFW-S03-M08; Status: done; Depends on: GFW-S03-T06; precedes GFW-S03-T07
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04 (distribution confidence only, not proof of GitHub or agent behavior); source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-04, REQ-05, REQ-08, REQ-10 and AC-03, AC-05, AC-07; `docs/features/github-feature-work-tracking/sdd.md` § Quality Strategy and Planned Evidence prioritizes executable distribution checks over pinned prompt wording; on-demand pointers: SDD §§ Publish a checked Task handoff (diagram and prose), Quality Strategy and Planned Evidence; `docs/architecture.md` § 9. Quality verification; Story § Verification Expectations; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`
- Attribution: `pnpm run validate:packed-runtime` failed once at Story HEAD `9188b8bb5cf623f4b46bd49bfd636002f4e8eff7`, `scripts/validate-packed-agent-guided-evals.mjs:20`, because the packed skill no longer contains exact prose “Select one active issue in stable suite/case/check order”. The same exact check failed at observed Epic/base HEAD `824520dd1c21abaecccdb0d4b63139a3b6a21037`; validator and skill were identical at both heads. Classify as pre-existing, not a T07 regression. No fix or retry has been attempted.
- Owning area: only `scripts/validate-packed-agent-guided-evals.mjs`, currently 43 lines. Remove its brittle prompt-content and `templates/AGENTS.md` text/regex assertions and now-unused reads/imports, but retain installed skill file existence, catalog import, mandatory guided-eval catalog entry, supported Codex/Claude hosts, and exact target mapping. Do not modify templates, other packed validators, production behavior, or add substitute static assertions or fake tests.
- Preserve the 48 unstaged T07 test paths and main-agent-owned SDD/Story edits untouched, with index initially empty. Confirm path disjointness before staging. This Task's check and single scoped Conventional Commit cover only the validator script; never stage or commit T07 tests, plan files, progress log, or upstream documents. Stop if ownership or scope is no longer clear.

## Files

- `scripts/validate-packed-agent-guided-evals.mjs`

## Done when

- Task check: `pnpm run validate:packed-runtime`; pass: isolated npm-pack/install fixture completes and the guided-eval validator confirms package presence and mandatory Codex/Claude target routes without exact prose dependencies; expected evidence: exit 0 and “Packed guided-eval skill and Codex/Claude mandatory routes passed.” plus overall installed-runtime success. This is installed-distribution evidence, not agent-compliance or GitHub behavior evidence.
- Scope and regression evidence: `git diff --check` passes; inspect the validator-only scoped diff and staged path list before committing to show that executable file/catalog/route assertions remain, no wording/regex assertions or replacement fake tests were added, and no preserved T07 path or main-owned edit entered this Task's commit. Expected evidence: one changed script path and its passing scoped commit; record the pre-existing failure attribution and the successful check in append-only progress later.
- Source-size evidence: `node .agents/scripts/check-touched-source-file-lines.mjs` passes for the touched script; expected evidence: exit 0 and validator at or below 500 lines. The original T07 `pnpm run validate:packed-runtime` check remains required after this commit, alongside its `pnpm verify`, diff, size, and ownership evidence; do not treat this prerequisite pass as T07 completion.
- No separate live-model, live-GitHub, disposable-repository, manual QA, fuzz, or mutation run is introduced. Human review of the shipped guidance and actual remote/UX evidence remains at the Story and final Epic PR gates; exact wording drift is the accepted residual risk.
