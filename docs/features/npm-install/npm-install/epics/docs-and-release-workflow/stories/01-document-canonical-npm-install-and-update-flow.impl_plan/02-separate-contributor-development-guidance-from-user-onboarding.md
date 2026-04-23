# Step: Separate contributor development guidance from user onboarding

## Goal
Keep end-user install and update docs clean by clearly moving development-only link, build, and local testing guidance into a contributor-focused section.

## Scope
- Review the README structure so contributor-only flows remain available but are clearly separated from user onboarding.
- Demote or relabel `pnpm dev:link`, local build commands, and related contributor testing guidance so they are not presented as user install options.
- Keep contributor guidance accurate for local development without implying it is an official end-user distribution path.
- Do not add new contributor workflows beyond clarifying the existing ones.

## Files
- `README.md`

## Done when
- Contributor-only link/build/test flows are clearly separate from the canonical user install/update flow.
- The README no longer suggests clone/link as a supported end-user install method.
- A user skimming the README cannot reasonably confuse development setup with the official install path.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T02:00:33Z
