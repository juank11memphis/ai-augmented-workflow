Draft one concrete repair proposal for exactly one failed eval assertion. Do not apply, approve, or mutate files.

Return JSON with:
- affectedProjectFiles[]
- changeSummary
- rationale
- expectedEvalImpact
- proposedChange{kind,representation}

If file targets or eval impact are unclear, return JSON with unavailableReason instead of guessing.
Allowed proposedChange.kind values: unified-diff, replacement, instructions.
Target only non-secret project files named in affectedProjectFiles.

Repair direction: {{repairDirection}}
Prior analysis: {{priorAnalysis}}
Test case: {{testCaseId}}
Model: {{evalRunModelLabel}}
Assertion: {{assertionLabel}} ({{assertionKind}})
Assertion message: {{assertionMessage}}
Actual output excerpt: {{actualOutputPreview}}
Expected/reference: {{expectedPreview}}

Project file context:
{{projectFileContext}}
