# Token Consumption Inventory

## Purpose

This inventory ranks common Sibu-guided agent activities by inferred token consumption so maintainers can focus on the biggest likely sources of waste. It is directional planning guidance, not exact token analytics.

Exact consumption varies by model, client, tokenizer, file size, command output, and conversation history. The useful signal is the relative shape: broad raw context usually costs more than targeted snippets and compact summaries.


## Quality Guardrails

WE DO NOT COMPROMISE QUALITY. Token discipline exists to remove accidental waste, not to justify shallow context gathering, skipped validation, weaker safety, or lower-confidence answers.

Large context windows are a safety net, not a license to be careless. Sibu should use large context deliberately for quality-critical work and avoid spending it on preventable noise.

High-consumption activities are allowed when they protect correctness, safety, validation, user control, or the user's ability to trust the result. When an expensive operation is necessary, prefer making it deliberate: narrow it where possible, summarize the useful evidence, and briefly explain why the extra context was worth spending.

## Inferred Ranking

| Rank | Activity | Why it likely consumes more tokens | Preferred lower-waste behavior |
| --- | --- | --- | --- |
| 1 | Broad recursive command output across noisy directories | Recursive searches or logs can pull in dependencies, generated files, source maps, lockfiles, build artifacts, and repeated matches. A single broad command can flood the conversation with irrelevant text. | Narrow paths and patterns first. Exclude dependency, build, cache, and generated directories. Cap output. Summarize findings instead of pasting raw output. |
| 2 | Full file dumps for large files | Large source files, docs, generated bundles, copied dependency code, or source maps can dominate the context even when only one function or section matters. | Search for the relevant symbol or heading first. Read only the smallest useful snippet. Open the full file only when structure or hidden interactions matter. |
| 3 | Full diffs for large or multi-file changes | Full diffs can include formatting noise, generated output, dependency changes, and repeated context lines. They are often more detail than the user needs in chat. | Inspect diffs locally when needed, but report changed file paths and a concise summary. Share focused diff snippets only for decisions, risks, or review questions. |
| 4 | Verbose test, build, release, or CI output | Successful commands and long failure logs can print many lines that do not affect the next decision. Repeated validation output compounds quickly. | Capture the command, pass/fail result, and key failure lines. Increase verbosity only when diagnosing a specific failure. |
| 5 | Long-running debugging sessions with repeated context reads | Debugging can repeatedly revisit logs, search results, source snippets, and hypotheses. Re-reading unchanged context adds cost without improving understanding. | Keep a compact working summary of findings, decisions, and remaining hypotheses. Re-read only changed files or new evidence. |
| 6 | Loading many skills or planning artifacts for a narrow task | Each loaded instruction file or planning document adds standing context. Adjacent-but-unneeded skills can distract the model and increase prompt load. | Load the minimum sufficient skill and source artifacts for the task. Prefer story-local or feature-local artifacts over broad documentation sweeps. |
| 7 | Repository-wide discovery for a localized question | Global searches, tree listings, and broad inspections can surface many irrelevant files before the likely owner is known. | Start with known paths, filenames, symbols, or feature folders. Expand search only when narrow inspection fails. |
| 8 | Git inspection with large raw output | Full diffs, broad history, or status across many files can be useful, but raw output is often larger than the decision requires. | Use short status first. Summarize diffs. Ask the user to review full git output directly when that is more efficient or safer. |
| 9 | Long explanations, repeated status updates, and verbose final answers | Natural-language summaries can restate tool output or obvious facts, consuming context without advancing the work. | Keep responses short by default. Include only decisions, changed files, validation, risks, and the next needed user action. |
| 10 | Focused snippet reads, targeted searches, concise summaries, and short final responses | These usually keep only task-relevant evidence in context and leave room for reasoning, validation, and future work. | Prefer this mode by default. Expand only when quality requires it. |

## How to Use This Inventory

- Treat the ranking as a guide for attention, not a precise accounting system.
- Optimize the highest-ranked activities first because they are most likely to create accidental waste.
- Prefer narrowing, summarizing, and capping before asking the model to process raw bulk context.
- Consider handing raw review tasks back to the user when the user can inspect a full diff, log, or command output more efficiently outside the AI context.
- Keep enough evidence in the conversation for the agent to make responsible decisions.
