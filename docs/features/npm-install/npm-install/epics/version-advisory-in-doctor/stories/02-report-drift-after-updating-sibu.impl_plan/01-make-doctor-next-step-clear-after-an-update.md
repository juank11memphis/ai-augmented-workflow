# Step: Make doctor next-step clear after an update

## Goal
Adjust doctor messaging so that when a user has already updated Sibu and the newer installed templates now cause drift, the output clearly explains that `sibu sync` is the explicit next step.

## Scope
- Refine `sibu doctor` messaging only where it helps connect post-update drift to the existing `sibu sync` flow.
- Keep the current local drift detection behavior intact; do not add new mutation logic or new drift types.
- Ensure the doctor output remains clear whether or not an npm update advisory is also shown.
- Do not implement the packaged update simulation itself in this step.

## Files
- `src/features/doctor-project/handler.ts`
- `src/features/doctor-project/handler.test.ts`
- any related doctor-output tests updated for the clearer next-step wording

## Done when
- `sibu doctor` clearly tells users to run `sibu sync` when the newer installed template set causes drift.
- The messaging still keeps `sibu sync` as an explicit user choice rather than an automatic follow-up.
- Existing healthy and review-needed doctor flows remain understandable when combined with npm update advisory output.
- Any updated doctor tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:41:09Z
