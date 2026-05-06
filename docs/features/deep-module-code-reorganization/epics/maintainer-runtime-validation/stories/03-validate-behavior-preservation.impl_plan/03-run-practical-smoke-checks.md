# Step: Run practical smoke checks

## Goal

Perform practical command smoke checks in a temporary project where they can be run safely without changing the repository workflow state.

## Scope

- Create or use a temporary project fixture outside the repository for smoke checks.
- Run practical non-destructive or safely isolated smoke checks for current commands, such as `sibu --help`, `sibu init`, `sibu doctor`, `sibu skills list`, and admin help commands.
- Run `sibu sync`, `sibu skills use <available-skill>`, and `sibu skills stop <selected-skill>` only if they can be executed safely and non-interactively or with explicit documented constraints.
- Document any smoke checks deferred because they require interactive choices that are not practical in the current execution environment.
- Do not mutate this repository's workflow files as part of smoke checks.

## Files

- `bin/sibu.js`
- `bin/admin/changelog.js`
- `bin/admin/release.js`
- `test/fixtures/`
- `/tmp` temporary smoke project

## Done when

- Practical smoke checks pass, or deferred checks are documented with exact reasons.
- No repository workflow files are changed by smoke checks.
- Any smoke-test deviation is resolved or documented as an explicit follow-up risk.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:58:13-06:00
