# Conventional Commits Cheatsheet

A quick reference for writing commit messages that follow Conventional Commits 1.0.0.

## Format

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

Examples:

```text
feat(cli): add sync command
fix: handle missing config file
refactor!: rename workflow state fields
```

## Common types

| Type | Use when the commit... |
| --- | --- |
| `feat` | Adds a user-facing feature |
| `fix` | Fixes a bug |
| `docs` | Changes documentation only |
| `style` | Changes formatting without changing behavior |
| `refactor` | Restructures code without adding features or fixing bugs |
| `perf` | Improves performance |
| `test` | Adds or updates tests |
| `build` | Changes build tooling, dependencies, or packaging |
| `ci` | Changes CI configuration or workflows |
| `chore` | Handles maintenance that does not fit another type |
| `revert` | Reverts a previous commit |

## Scope

Use a short noun in parentheses when it clarifies the affected area.

```text
feat(templates): add agent instructions template
fix(sync): preserve customized files
```

Skip the scope if it would be vague or redundant.

## Description

- Use the imperative mood: `add`, `fix`, `update`, not `added` or `updates`.
- Keep it concise, ideally under 72 characters.
- Do not capitalize the first word unless it is a proper noun.
- Do not end with a period.

## Body

Use a body when the commit needs context, motivation, or important implementation notes.

```text
fix(sync): avoid overwriting customized files

Keep locally customized managed files unchanged during sync and write the
incoming template beside them for manual review.
```

## Footers

Use footers for metadata such as issue references or breaking-change notes.

```text
feat(config): support project-level defaults

Refs: #42
```

## Breaking changes

Mark breaking changes with either `!` after the type/scope or a `BREAKING CHANGE:` footer.

```text
feat(cli)!: remove deprecated init flag
```

```text
feat(cli): remove deprecated init flag

BREAKING CHANGE: `sibu init --legacy` is no longer supported.
```

## Quick examples

```text
docs: add conventional commits cheatsheet
chore(deps): update pnpm lockfile
ci: run tests on pull requests
fix(doctor): report missing state file clearly
feat(sync): add interactive template review
refactor(state): extract managed file status mapper
```

## Choosing the right type

- If users get a new capability, use `feat`.
- If broken behavior is corrected, use `fix`.
- If only docs changed, use `docs`.
- If behavior is unchanged but code structure improves, use `refactor`.
- If you are unsure between `chore` and a more specific type, prefer the more specific type.
