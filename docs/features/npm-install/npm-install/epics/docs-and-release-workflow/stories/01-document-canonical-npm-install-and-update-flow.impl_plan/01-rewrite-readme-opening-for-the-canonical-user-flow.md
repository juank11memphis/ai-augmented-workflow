# Step: Rewrite README opening for the canonical user flow

## Goal
Reshape the README opening so a new user immediately sees one official npm install and update path for Sibu, without needing to interpret development-only guidance.

## Scope
- Rewrite the README’s opening user-facing section around the canonical npm install command.
- Make the first-run and update path explicit: install with npm, run `sibu doctor`, update with npm if prompted, rerun `sibu doctor`, then choose `sibu sync` if drift is reported.
- Keep the wording concise, practical, and aligned with Sibu’s product voice.
- Do not document maintainer publish steps in this step.

## Files
- `README.md`

## Done when
- The README opening presents npm as the single supported user install path.
- The README explains the standard update path through `sibu doctor` and `sibu sync`.
- The user flow reads cleanly without mixing in contributor-only setup details.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-23T01:58:03Z
