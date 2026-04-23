# Step: Add packaged update flow validation

## Goal
Prove the intended update flow end to end by validating that an older packaged install can be updated to a newer packaged build and that rerunning `sibu doctor` then reports template drift without changing project files.

## Scope
- Add a repeatable validation harness that simulates: older tarball install → doctor advisory/update guidance → install newer tarball → rerun doctor.
- Build both the “older” and “newer” packaged artifacts locally for this validation flow; do not depend on a real npm publish cycle or live registry state.
- Use isolated temporary directories or fixture projects so the flow runs outside the source checkout.
- Ensure the validation confirms no project files are mutated by the doctor rerun itself.
- Prefer deterministic packaged fixtures or temporary copies over a real npm publish cycle.
- Use two local tarballs as the source of truth for the before/after update scenario.
- Do not add automatic sync or new mutation behavior in this step.

## Files
- `scripts/validate-post-update-doctor-drift.mjs`
- `package.json`
- `test/fixtures/packed-runtime/`
- any supporting validation helper files used by the packaged update flow

## Done when
- There is one repo-local validation command for the packaged update flow.
- The validation proves rerunning `sibu doctor` after updating to a newer packaged build reports drift.
- The validation proves no files change until `sibu sync` is explicitly run.
- The flow uses two locally produced tarballs instead of any real npm publish cycle.
- The flow avoids depending on the source checkout being the runtime under test.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:48:12Z
