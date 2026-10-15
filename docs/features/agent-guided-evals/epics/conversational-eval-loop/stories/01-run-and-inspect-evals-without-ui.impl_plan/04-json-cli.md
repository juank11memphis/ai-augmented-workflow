# Step: Add thin JSON eval CLI operations

## Goal

Expose `sibu evals suites`, `describe`, `run`, and `result` as stable JSON operations while leaving bare `sibu evals` as the browser launcher.

## Scope

- Task ID: AGE-US-01-T04; Milestone ID: AGE-US-01-M03; Status: done; Depends on: AGE-US-01-T01, AGE-US-01-T02, AGE-US-01-T03.
- Story acceptance criteria: AC-01, AC-02, AC-03, AC-04; source decisions: SDD four logical JSON operations and thin adapter boundary, no HTTP/agent repair/mutation; BRD `REQ-01/02/09/10`, `AC-01/06/07`; on-demand pointers: `docs/features/agent-guided-evals/sdd.md` §§ Command contracts and boundaries, Main interaction and verification loop (pre-repair sequence), Quality strategy and planned verification; `src/entrypoints/cli/create-program.ts`, `execute-command.ts`, `command.ts`; applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`.
- Owning area: CLI entrypoint only. Parse flags and IDs into Commands, call Local Evals Workbench public handlers/composition, serialize stable JSON Results, and set honest process exit codes. Keep syntactic validation at CLI and semantic validation in handlers. Do not embed filesystem, runner, provider, or business logic in CLI. Do not add repair/edit/approval shortcuts.
- Use one machine-readable JSON result per invocation on stdout; direct operational logs to a safe separate channel so JSON remains parseable. Preserve typed blocked/error/partial/interrupted distinctions, actionable reason, run ID where allocated, and capped selected evidence. Flag spelling is adapter-local; document it via CLI help/tests without changing SDD outcome meanings.
- Avoid growing `src/entrypoints/cli/execute-command.test.ts` (currently 292 lines) or `create-program.ts` into a catch-all: put dedicated eval CLI tests and presentation in cohesive files. Preserve bare-command browser launch and existing UI tests.

## Files

- `src/entrypoints/cli/{create-program,execute-command,command}.ts`.
- `src/entrypoints/cli/evals-json.ts` and `evals-json.test.ts`.
- `src/entrypoints/cli/{create-program,execute-command}.test.ts` for narrow existing-behavior assertions.

## Done when

- Task check: `pnpm run build`, then `node --test bin/entrypoints/cli/evals-json.test.js bin/entrypoints/cli/create-program.test.js bin/entrypoints/cli/execute-command.test.js`; pass: argument-to-Command and Result-to-JSON tests cover all four operations, malformed/invalid IDs, missing model/judge, terminal and nonterminal outcomes, bounded one-assertion evidence, no mutation subcommand, and bare `evals` UI launch; expected evidence: parseable single-result stdout, appropriate exit codes, no server for headless commands, unchanged browser-launch assertion.
- CLI unit/regression evidence answers SDD Quality strategy and Story AC-01–04. It proves deterministic command wiring, not coding-agent behavior; no live model or external provider is used.
- CLI wiring imports only the module's public interface/composition API; no direct runner, artifact store, or another slice's internals.
