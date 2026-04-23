# Add a non-blocking npm version advisory to sibu doctor

## Epic
[Version Advisory in Doctor](../epic_brief.md)

## User Story
As a user with an older installed Sibu version, I want `sibu doctor` to tell me when a newer npm version exists, so that I can update with the standard npm command.

## Context
The feature brief and technical design place update detection in `sibu doctor`, not in `AGENTS.md`, and require the advisory to remain non-blocking and standard npm-based.

## Scope
- Add npm version lookup to `sibu doctor`.
- Show advisory update messaging using the npm install command.
- Cache or otherwise limit repeated network checks enough to avoid noisy behavior.

## Out of Scope
- Auto-update behavior.
- Template drift evaluation after the user updates.
- Publishing and packaging metadata.

## Acceptance Criteria
- `sibu doctor` shows a clear advisory when a newer npm version exists.
- The advisory tells the user to run `npm install -g @juancr11/sibu`.
- Failure to reach npm does not fail the workflow health check.
- A newer available CLI version does not by itself mark the workflow unhealthy.

## Validation
- Run `sibu doctor` in a scenario where a newer npm version is available.
- Run `sibu doctor` in a scenario where npm lookup is unavailable and confirm local health checks still complete.

## Notes
- Implementation should follow the technical design’s registry-integration and caching boundaries.
