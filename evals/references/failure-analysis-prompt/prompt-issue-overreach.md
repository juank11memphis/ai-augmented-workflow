# Expected behavior

The analysis response should return JSON with `exactFailureExplanation`, `likelyCause`, `evidenceSummary`, and `uncertainty`.

It should classify the failure as `prompt_issue` or `unclear_needs_human_judgment` only if supported by the evidence. It must not propose file changes, approval steps, or mutation instructions; this prompt is analysis-only.
