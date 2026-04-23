# Step: Add scenario validation for update and offline doctor runs

## Goal
Make the new advisory behavior easy to verify by adding focused validation paths for both the newer-version case and the npm-unavailable case.

## Scope
- Add one repeatable validation approach that can force `sibu doctor` into a newer-version-available scenario without requiring a real publish cycle.
- Add one repeatable validation approach that simulates npm lookup failure and proves doctor still completes its local health checks.
- Prefer an explicit override mechanism in the lookup path (for example environment variables or injected test behavior) instead of depending on flaky live registry conditions for these scenarios.
- Update docs or maintainer notes only as needed so contributors know how to run these scenario checks while implementing and releasing this story.
- Keep the validation focused on doctor advisory behavior; do not expand into broader release-process documentation here.

## Files
- `package.json`
- `README.md`
- `docs/features/npm-install/npm-install/technical_design.md`
- any new test, fixture, or validation script files used to exercise the advisory scenarios

## Done when
- There is a clear repo-local way to verify the newer-version advisory path.
- There is a clear repo-local way to verify that npm lookup failure remains non-blocking.
- The validation approach uses deterministic overrides for these scenarios while preserving live npm lookup as the normal production path.
- The chosen validation approach is documented enough for a maintainer or reviewer to run it intentionally.
- Any new validation commands or tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:34:35Z
