# Ekko update roadmap

## Goal

Ekko should eventually help projects detect when their AI workflow files were generated from older templates and guide users toward the right maintenance action.

Example scenario:

1. Sandra runs `ekko init` and initializes a project successfully.
2. Later, Juanca updates the Ekko `AGENTS.md` template and publishes the change.
3. Sandra comes back to the project and starts Codex.
4. Codex should be able to notice that the project uses Ekko-managed workflow files and suggest running `ekko init` or a future maintenance command when the setup may be outdated.

## Core idea

Ekko needs to leave behind machine-readable metadata so future runs, users, and agents can understand:

- which Ekko version initialized the project,
- which template version generated each managed file,
- which files Ekko manages,
- whether a managed file has been modified after generation.

A future metadata file could live at:

```txt
.ekko/state.json
```

Example shape:

```json
{
  "ekkoVersion": "0.1.0",
  "templateVersion": "1",
  "generatedAt": "2026-04-14T18:30:00.000Z",
  "managedFiles": {
    "AGENTS.md": {
      "template": "AGENTS.md",
      "templateVersion": "1",
      "sha256": "..."
    },
    ".codex/config.toml": {
      "template": ".codex/config.toml",
      "templateVersion": "1",
      "sha256": "..."
    }
  }
}
```

## Safety rule

Ekko should never silently overwrite user-edited workflow files.

If a managed file still matches the hash recorded in `.ekko/state.json`, Ekko can consider it safe to update later.

If the hash does not match, Ekko should assume the user changed the file and should avoid overwriting it without explicit confirmation.

## Phase 1: Add Ekko state metadata

Add `.ekko/state.json` during `ekko init`.

The state file should record:

- Ekko CLI version,
- current template version,
- generated timestamp,
- selected supported agents,
- managed files,
- template used for each file,
- content hash for each generated file.

Initial behavior should stay safe and simple:

- create `.ekko/state.json` when missing,
- update it when Ekko creates new missing files,
- do not overwrite existing workflow files,
- do not attempt template upgrades yet.

## Phase 2: Add Ekko maintenance instructions to `AGENTS.md`

Update the generated `AGENTS.md` template with a small section explaining that the project uses Ekko.

Example:

```md
## Ekko maintenance

This repository uses Ekko to manage AI workflow setup. If workflow files appear missing or outdated, ask the user to run `ekko init` or `ekko doctor`.
```

This gives coding agents like Codex a project-level instruction that points users back to Ekko when workflow drift is suspected.

## Phase 3: Add `ekko doctor`

Add a read-only diagnostic command:

```sh
ekko doctor
```

The command should check:

- whether `.ekko/state.json` exists,
- whether all selected agent support files exist,
- whether managed files still match their recorded hashes,
- whether recorded template versions are older than the current Ekko template version.

Example output:

```txt
Workflow loop drift detected.

AGENTS.md was generated from template version 1.
Current template version is 2.

Run:
  ekko init
```

At this phase, `doctor` should only report status. It should not modify files.

## Phase 4: Make `ekko init` update metadata intelligently

Once `.ekko/state.json` exists, `ekko init` can become smarter:

- create any missing selected workflow files,
- refresh `.ekko/state.json`,
- warn when managed files are outdated,
- warn when managed files were user-modified,
- still avoid overwriting existing workflow files.

`ekko init` should remain idempotent and safe to run repeatedly.

## Phase 5: Add `ekko sync`

Add an explicit update command:

```sh
ekko sync
```

`ekko sync` is the template update workflow. It should help users understand what changed in Ekko templates and decide how, or whether, to adopt those changes.

The key product principle is:

> Do not show users a raw diff by default. Explain the meaningful template changes and let the user decide what to do.

Raw diffs between a customized workflow file and a new template can be noisy. A better UX is to say something like:

```txt
AGENTS.md has local edits.
I will not overwrite it automatically.

The latest AGENTS.md template adds:
- Ekko maintenance instructions.
- Guidance for when agents should suggest `ekko init`.
- Guidance for when agents should suggest `ekko doctor`.
```

### Phase 5A: Add a template manifest

Add a template manifest that records template versions and human-readable change summaries.

Possible file:

```txt
templates/manifest.json
```

Example:

```json
{
  "templateVersion": "2",
  "templates": {
    "AGENTS.md": {
      "version": "2",
      "description": "Project-level agent instructions.",
      "changes": [
        "Added Ekko maintenance instructions.",
        "Explained when agents should suggest `ekko init`.",
        "Explained when agents should suggest `ekko doctor`."
      ]
    },
    ".codex/config.toml": {
      "version": "1",
      "description": "Codex configuration pointing to AGENTS.md.",
      "changes": []
    }
  }
}
```

This lets Ekko explain template updates in human language instead of relying on raw file diffs.

### Phase 5B: Add `ekko sync` preview mode

The first version of `ekko sync` should be safe and mostly observational.

It should inspect `.ekko/state.json`, compare recorded template versions with the current manifest, and report:

- which managed files are up to date,
- which managed files have newer templates available,
- which managed files have local edits,
- which files are unmanaged or missing,
- the human-readable template changes from `templates/manifest.json`.

Initial behavior can be read-only:

```txt
AGENTS.md has local edits.
Template version 2 is available.

New template changes:
- Added Ekko maintenance instructions.
- Explained when agents should suggest `ekko init`.
- Explained when agents should suggest `ekko doctor`.

No files changed.
```

This phase validates the UX before Ekko starts applying updates.

### Phase 5C: Add interactive sync actions

Once preview mode feels right, `ekko sync` can offer actions based on file status.

#### If the file has no local edits

If the current file hash matches the hash recorded in `.ekko/state.json`, Ekko can consider the file safe to update.

Possible prompt:

```txt
AGENTS.md has no local edits.
Template version 2 is available.

Apply update?
```

Options:

- apply update,
- skip.

If the user applies the update, Ekko can overwrite the file with the new rendered template and update `.ekko/state.json`.

#### If the file has local edits

If the current file hash does not match the hash recorded in `.ekko/state.json`, Ekko should treat the file as user-modified and never overwrite it automatically.

Possible prompt:

```txt
AGENTS.md has local edits.
I will not overwrite it automatically.

The latest AGENTS.md template adds:
- Ekko maintenance instructions.
- Guidance for when agents should suggest `ekko init`.
- Guidance for when agents should suggest `ekko doctor`.

What do you want to do?
```

Options:

1. Mark as reviewed
2. Write latest template beside my file
3. Stop managing this file
4. Skip for now

##### Option: Mark as reviewed

Use this when the user has seen the new template changes and wants to handle them manually or intentionally ignore them.

Ekko should update metadata without pretending the customized file was generated from the new template.

Possible metadata:

```json
{
  "template": "AGENTS.md",
  "templateVersion": "1",
  "lastReviewedTemplateVersion": "2",
  "sha256": "current-user-file-hash",
  "status": "customized"
}
```

Meaning:

- the file originally came from template version 1,
- the user reviewed template version 2,
- the file is customized,
- Ekko should not keep warning about version 2.

##### Option: Write latest template beside my file

Use this when the user wants to inspect the full new template without overwriting local edits.

Ekko can write to a safe side location, for example:

```txt
.ekko/sync/AGENTS.template-v2.md
```

Then tell the user:

```txt
I wrote the latest AGENTS.md template to:
.ekko/sync/AGENTS.template-v2.md

Review it and copy over anything you want.
```

This should not automatically mark the file as reviewed unless the user explicitly chooses that too.

##### Option: Stop managing this file

Use this when the user heavily customizes a file and does not want Ekko to warn about template drift for it anymore.

Possible metadata:

```json
{
  "template": "AGENTS.md",
  "lastReviewedTemplateVersion": "2",
  "sha256": "current-user-file-hash",
  "status": "unmanaged",
  "reason": "user opted out"
}
```

Ekko should stop warning about template drift for that file, but can continue managing other files.

##### Option: Skip for now

Use this when the user wants to decide later.

Ekko should make no metadata changes. `ekko doctor` or a future `ekko sync` should continue reporting the drift.

### Phase 5D: Evolve metadata statuses

To support `ekko sync`, managed file metadata should evolve from a simple hash record into a lifecycle-aware record.

Potential statuses:

- `managed`: file matches what Ekko last generated; safe to offer automatic updates.
- `customized`: file has user edits; never overwrite automatically.
- `unmanaged`: user opted out of Ekko management for this file.

Possible future shape:

```json
{
  "managedFiles": {
    "AGENTS.md": {
      "template": "AGENTS.md",
      "templateVersion": "1",
      "lastReviewedTemplateVersion": "2",
      "sha256": "...",
      "status": "customized"
    }
  }
}
```

`ekko sync` should use this metadata to avoid repeated warnings and to respect user ownership of customized files.

## Long-term direction

The long-term workflow could become:

```sh
ekko init      # safe setup and missing-file repair
ekko doctor    # read-only health check
ekko sync      # explicit template/update workflow
```

This keeps initialization safe while still allowing projects to benefit from future Ekko template improvements.
