# Step: Prove installed-package headless parity

## Goal

Verify that the packaged Sibu executable can discover, describe, run, and inspect a disposable eval project with the same semantics as the workbench, then complete final repository validation once changes stabilize.

## Scope

- Task ID: AGE-US-01-T05; Milestone ID: AGE-US-01-M03; Status: done; Depends on: AGE-US-01-T04.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: SDD Quality strategy and planned verification, shared suite/results, browser-free headless path, no agent repair in this Story; BRD `REQ-01/02/09/10`, `AC-01/06/07`; on-demand pointers: `docs/features/agent-guided-evals/sdd.md` §§ Quality strategy and planned verification, Safety, state, and failure behavior; `scripts/validate-packed-cli-runtime.mjs`; `scripts/validate-packed-eval-execution.mjs`; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning area: packaged-runtime verification. Extend the existing isolated installed-package smoke with a disposable Git project and fake/local runner. Invoke the installed `sibu` binary for the four JSON operations, parse outcomes, verify one assertion's bounded evidence and run ID, compare suite/run artifact semantics with the existing UI fixture, and assert the headless commands never start an HTTP server. Preserve bare `sibu evals` browser-launch smoke.
- Include installed-package non-success probes for invalid IDs, unavailable model/judge, missing declared credentials, unsafe artifacts, and interrupted/partial execution. The fixture may inspect its own created files, but no live model, external side-effecting tool, or agent behavior eval is in the routine suite. Test no project-file mutation, including pre-existing edits.
- Final validation strategy after implementation stabilizes: run `pnpm run check` once for types, `pnpm run test` once for build plus compiled tests (it already includes `pnpm build`), `pnpm run validate:packed-runtime` once for installed/distributed behavior, and `node .agents/scripts/check-touched-source-file-lines.mjs` once for the 500-line gate. Do not add standalone `pnpm build` or `pnpm verify` to this final batch because `pnpm run test` already builds and runs compiled tests. Record pass/fail output and concrete fixture evidence for every `Done when` condition; a passing aggregate alone is insufficient.
- Deeper property/fuzz/mutation tests are skipped: deterministic fake-port state matrices and disposable runner failure probes cover this bounded adapter risk better than random inputs. Manual browser QA is skipped because UI layout is unchanged; existing browser-launch and server fixture regression remain. Live-agent evals are excluded by Story scope and SDD isolation rule; no claim about Codex/Claude Code following instructions is made.

## Files

- `scripts/validate-packed-cli-runtime.mjs` and a cohesive `scripts/validate-packed-headless-evals.mjs` (or equivalent installed-package fixture helper).
- `scripts/validate-packed-eval-execution.mjs` only if existing fixture helpers need a narrow public reuse seam.
- `src/entrypoints/cli/evals-json.test.ts` and focused Local Evals Workbench acceptance tests for any uncovered failure state.

## Done when

- Task check: `pnpm run validate:packed-runtime`; pass: isolated install's headless four-operation smoke, selected/all scope, JSON parsing, persisted run/result parity, bounded failure evidence, browser-free execution and bare UI launch pass; expected evidence: installed executable path, fixture run ID/terminal manifest and named blocked/interrupted probes, with no HTTP dependency.
- Final check: `pnpm run check`, `pnpm run test`, `pnpm run validate:packed-runtime`, and `node .agents/scripts/check-touched-source-file-lines.mjs` run directly after stabilization; pass: each exits zero and touched source files are at most 500 lines. The packed-runtime command need not be rerun solely for a different permission result if already run as the stable Task check; record that single result as final evidence.
- The Story PR can review AC-01–04 evidence, `REQ-01/02/09/10` traceability, no project mutation, and honest non-success outcomes. Human judgment remains for source-alignment and release readiness, not a fabricated claim that tests prove live-agent behavior.
