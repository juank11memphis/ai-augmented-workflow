# Step: Surface non-blocking update advisory in doctor

## Goal
Teach `sibu doctor` to show a clear npm update advisory when a newer published version exists, without turning that advisory into a workflow failure or interfering with the existing local health-check flow.

## Scope
- Wire the shared npm version-check result into `src/features/doctor-project/handler.ts`.
- Show advisory messaging that tells the user to run `npm install -g sibu` when a newer version exists.
- Keep npm lookup failures informational or silent enough that they do not fail doctor and do not mark the workflow unhealthy on their own.
- Preserve the existing distinction between healthy local workflow state and review-needed local workflow issues.
- Do not implement post-upgrade drift handling beyond the normal existing doctor output; that belongs to the next story.

## Files
- `src/features/doctor-project/handler.ts`
- `src/shared/catalog.ts`
- `src/shared/npm-version.ts`
- any doctor-focused tests added or updated for advisory output

## Done when
- `sibu doctor` shows a clear advisory only when a newer npm version exists.
- The advisory explicitly points to `npm install -g sibu`.
- A newer available CLI version does not by itself change the workflow-health decision or set a failing exit code.
- npm lookup unavailability still allows normal local doctor checks to complete.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:29:40Z
