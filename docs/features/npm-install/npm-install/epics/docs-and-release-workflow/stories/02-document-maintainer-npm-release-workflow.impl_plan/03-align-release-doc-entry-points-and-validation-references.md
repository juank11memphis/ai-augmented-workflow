# Step: Align release doc entry points and validation references

## Goal
Make sure maintainers can find the release workflow and that its validation references match the repo’s implemented npm packaging checks.

## Scope
- Add or refine any brief pointers from existing docs to the maintainer release doc.
- Ensure validation commands referenced in the release doc match the repo’s current scripts and documented checks.
- Confirm the release doc, README, changelog rule, and technical design do not contradict each other.
- Do not broaden scope into new release automation.

## Files
- maintainer release document file
- `README.md` if a short maintainer pointer is needed
- `docs/features/npm-install/npm-install/technical_design.md` if consistency edits are needed

## Done when
- A maintainer starting from the repo docs can discover the release workflow without guesswork.
- Validation commands in the release doc match the implemented scripts and npm packaging flow.
- The story acceptance criteria can be verified by reading the updated docs together.

## Review status
- Approved by: `juanca`
- Approved at: `2026-04-23T02:28:11Z`
