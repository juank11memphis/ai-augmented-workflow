---
name: structured-logging
description: Use when writing or modifying code that affects logging or meaningful operational behavior, so logs stay structured, safe, useful, and concise.
---

# Structured Logging

Use this skill when writing or modifying code that emits logs or changes meaningful operational behavior: workflows, command handlers, jobs, external calls, retries, errors, long-running operations, state changes, important outcomes, or other observability-relevant paths.

Do not add logs to trivial pure logic, noisy implementation details, or paths where a log would not help someone diagnose what happened.

## Logging approach

- Follow the repository's existing logging conventions first.
- If the project has no clear convention, choose a widely accepted logger for the current language, framework, and runtime.
- Do not introduce a new logging dependency when the repository already has a reasonable logging approach.
- Prefer a small first-party project-local helper or wrapper around the chosen logger when it keeps log calls concise and centralizes names, levels, formatting, or shared fields.

## Structured logs

- Use structured, machine-readable logs for meaningful events; prefer JSON when the logger/runtime supports it.
- Use clear event names and consistent field names.
- Make logs tell an operational story: what started, what decision was made, what external interaction happened, what outcome occurred, and what failed or was retried.
- Include useful safe metadata when available, such as operation or workflow name, request or correlation id, safe entity ids, counts, timings, state transitions, outcomes, and safe error context.
- Keep individual log calls small; move repeated fields or formatting into a local helper instead of spreading boilerplate through business logic.

## Safety

Never log secrets, credentials, tokens, API keys, session cookies, raw personal data, full prompts or model responses, or large user payloads. If context is useful but sensitive, log a safe identifier, count, type, or redacted summary instead.
