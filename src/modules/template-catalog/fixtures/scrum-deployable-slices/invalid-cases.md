# Counterexamples — never approve these as Stories

## Unrelated behaviors
One Story creates the new Scrum template and also changes unrelated CLI account management. Split by delivery outcome.

## Horizontal-only scope
A database-only Story cannot work until an unmerged backend and frontend Story exists. Reject as a nonworking layer.

## Unresolved question
**Status:** draft. Open question: which capability owns the behavior? Do not label ready-for-planning.

## Missing or invalid BRD ID
`REQ-99` does not occur in `src/modules/template-catalog/fixtures/scrum-deployable-slices/sample-brd.md`; stop for source correction. A Story with no source ID cannot claim traceability.

## Unverifiable criterion
"The Story feels polished" has neither an observable outcome nor a `needs human/LLM-judge review` label; rewrite or explicitly label human judgment.

## UI-relevant omission
A UI-changing Story that says UX is `not applicable` despite required `ux.md` mockups is invalid; cite applicable UX sections and visual-comparison evidence.
