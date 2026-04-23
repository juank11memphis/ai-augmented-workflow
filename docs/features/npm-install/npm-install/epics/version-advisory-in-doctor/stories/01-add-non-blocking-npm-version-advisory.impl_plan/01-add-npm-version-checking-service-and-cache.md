# Step: Add npm version checking service and cache

## Goal
Introduce one small shared path that can ask npm for the latest published Sibu version and cache the result long enough to avoid noisy repeated checks, while keeping network failures advisory-only.

## Scope
- Add a shared helper or module for npm latest-version lookup using npm's standard package metadata path for the chosen package name.
- Add a small local cache mechanism with a short-lived TTL so repeated `sibu doctor` runs do not hit the network every time.
- Build the lookup path so validation can override the live npm result in a controlled way (for example via explicit environment variables or injected lookup behavior) without changing the normal runtime contract.
- Keep the lookup result structured so `sibu doctor` can distinguish newer-version, up-to-date, and lookup-unavailable outcomes.
- Reuse existing version/package constants where practical; if the package name must become a constant, define it in one shared place.
- Do not wire user-facing doctor output yet and do not add update-after-upgrade messaging beyond the lookup result itself.

## Files
- `src/shared/catalog.ts`
- `src/shared/paths.ts`
- `src/shared/state.ts`
- `src/shared/npm-version.ts`
- `src/shared/types.ts`
- any focused tests added for the new shared lookup/cache behavior

## Done when
- The repo has one shared npm version-check path that returns explicit advisory outcomes instead of throwing on normal lookup failures.
- A short-lived cache prevents repeated network requests for every immediate `sibu doctor` run.
- The package name and current CLI version used for comparison come from stable shared data rather than duplicated string literals.
- The lookup design leaves a deterministic hook for tests and manual validation to simulate both “newer version available” and “npm unavailable” without depending on a real publish cycle.
- Any new focused tests for parsing, comparison, or cache behavior pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:25:06Z
