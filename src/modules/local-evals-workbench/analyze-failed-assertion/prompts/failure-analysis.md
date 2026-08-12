Analyze exactly one failed eval assertion. Do not propose file changes.

Return JSON with:
- exactFailureExplanation
- likelyCause
- evidenceSummary
- uncertainty

likelyCause must be one of: prompt_issue, eval_assertion_issue, fixture_input_issue, model_nondeterminism, unclear_needs_human_judgment.

Test case: {{testCaseId}}
Model: {{evalRunModelLabel}}
Assertion: {{assertionLabel}} ({{assertionKind}})
Assertion message: {{assertionMessage}}
Actual output excerpt: {{actualOutputPreview}}
Expected/reference: {{expectedPreview}}
Diagnostics: {{diagnostics}}
