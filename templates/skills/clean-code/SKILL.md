---
name: clean-code
description: Use this skill when writing or modifying code and you need general code-quality guidance.
---

# clean-code

Use this skill when writing or modifying code and you need general code-quality guidance.

Apply these principles by default unless a more specific repo rule or task requirement overrides them.

## Use this skill for

- writing new code
- editing existing code
- reviewing implementation quality
- simplifying code during an in-scope change

## Core principles

### 1. Prefer clarity over cleverness
- Write code that is easy to read on the first pass.
- Avoid surprising control flow, hidden side effects, and dense expressions.
- If a simpler form exists, prefer it.

### 2. Use clear, descriptive names
- Names should reveal intent.
- Prefer names that explain what something represents or does.
- Avoid unnecessary abbreviations unless they are obvious in context.

#### Prefer
```ts
const authenticatedUserId = session.user.id;
const recommendedTracks = buildRecommendedTracks(seedTracks);
```

#### Avoid
```ts
const uid = session.user.id;
const recs = buildRecommendedTracks(seedTracks);
```

### 3. Keep functions focused
- A function should do one thing well.
- If a function is doing multiple conceptually different jobs, split it.
- Keep nested logic shallow when possible.

### 4. Keep control flow simple
- Prefer straightforward conditionals over clever compact forms.
- Avoid inline assignments in conditionals.
- Prefer early returns or clear branching when they improve readability.

#### Prefer
```ts
const playlist = await playlistRepository.findById(playlistId);

if (!playlist) {
  throw new Error("Playlist not found");
}
```

#### Avoid
```ts
if (!(playlist = await playlistRepository.findById(playlistId))) {
  throw new Error("Playlist not found");
}
```

### 5. Keep the right level of abstraction
- A function or module should not mix high-level policy with low-level details without a good reason.
- Keep related concepts together.
- Separate orchestration from implementation detail when that separation improves understanding.

### 6. Prefer the simplest solution that works
- Prefer the simplest solution that satisfies the real requirement.
- Do not add abstraction, indirection, or configurability unless it clearly pays for itself.
- If a simple solution is sufficient, stop there.

### 7. Avoid duplication with judgment
- Remove meaningful duplication when it reduces maintenance cost.
- Do not introduce premature abstractions just to eliminate a small amount of repetition.
- Prefer a little duplication over the wrong abstraction.

### 8. Comments should add value
- Prefer code that explains itself.
- Use comments when they provide context, intent, or rationale that the code alone cannot express.
- Do not add comments that merely restate the code.

### 9. Make error paths understandable
- Error handling should be explicit and readable.
- Validate required inputs at function boundaries before doing work. If a missing or invalid input makes the whole operation fail, do not continue with partial defaults or defensive zero-value output unless the function explicitly supports partial results.
- Add useful context when surfacing errors.
- Do not hide failure paths in clever expressions.

### 10. Keep changes tidy
- During a requested change, it is good to remove clearly unused code or obvious local clutter when it is safe and in scope.
- Leave the touched area cleaner than you found it, without drifting into unrelated refactors.

### 11. Prefer consistency
- Match the surrounding style when it is already reasonable.
- Use existing project conventions unless there is a strong reason not to.

### 12. Keep operational behavior observable
- When code changes affect logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or important outcomes, keep logging useful, concise, and safe.
- Use `structured-logging` for detailed logging guidance instead of duplicating that policy here.

## Decision rule

When unsure, prefer:
1. readability
2. simplicity
3. explicitness
4. small focused units
5. consistency with the surrounding code
