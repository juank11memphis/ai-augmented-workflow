# UX Spec: GitHub Feature Work Tracking

## Input Product Artifact

`docs/features/github-feature-work-tracking/brd.md` defines GitHub-only planned feature work, readiness, authoritative issues and artifacts, checked-Task handoff, and human Epic review. The flows below address its REQ-01 through REQ-10 and AC-01 through AC-07. This spec governs Sibu's CLI and agent-led messages, not GitHub's own interface.

## Product and Domain Grounding

Sibu should make small, checked work easy to follow without becoming a project-management dashboard. The engineer, including a solo engineer, needs to know what was verified, what was published, and what can happen next. The **Feature Issue** holds the BRD, UX, and SDD; Epic and Story issues form native sub-issues; a checked Task becomes a handoff only when its commit and matching Story progress are published. An unfinished Task has no owner or in-progress claim. Local setup, maintenance, and narrow fixes remain available without GitHub.

## UX Intent and Affected Surfaces

Affected moments are the first planned-feature action, missing GitHub prerequisites, feature-document publication, Story and Epic creation, checked-Task handoff, cross-machine resumption, superseded local work, and verified PR/issue completion. `sibu init`, `doctor`, and `sync` gain no tracking-mode prompt or GitHub dependency. GitHub issue and PR pages are external surfaces; Sibu supplies concise records there but does not redesign them. No dashboard or GitHub Projects view is introduced.

The visible order is **current state → next action → consequence → optional detail**. Routine success is brief. Blockers show enough evidence for a safe decision without burying the action.

## User Flows

### Start planned feature work (BRD REQ-01, REQ-02; AC-01, AC-02)

1. Before the first Feature issue or artifact, check that the current project has a GitHub repository remote and usable GitHub MCP access to required issue, sub-issue, and artifact actions.
2. If the remote is missing, stop before creating a feature artifact. Say that no GitHub repository is connected and direct the engineer to connect the project's GitHub repository, then retry. Do not say MCP is the only problem.
3. If the remote exists but GitHub MCP is missing or cannot perform a required action, name that prerequisite and direct the engineer to configure or restore GitHub MCP, then retry. Do not create a local substitute or claim the feature started.
4. Once ready, create the Feature issue and show its link. `sibu init`, `doctor`, `sync`, and narrow fixes remain usable regardless of this readiness state.

### Publish feature documents (BRD REQ-03, REQ-09; AC-02, AC-06)

1. Read only published upstream context needed for the current stage through GitHub MCP into the agent session. Do not download a feature-artifact folder or show a local file as the authoritative destination.
2. When a BRD, UX, or SDD stage finishes, publish its artifact on the Feature issue. Confirm publication before describing it as complete; show the document name and Feature issue link.
3. If publication is unavailable or ambiguous, stop downstream work and state what is confirmed. An unpublished in-session draft is not a durable checkpoint and may need to be redone after interruption.
4. Epic and Story definitions appear in their native issue hierarchy, not duplicate local Markdown outputs. Show the issue link after successful creation.

### Resume and hand off Story work (BRD REQ-04 through REQ-08; AC-03 through AC-05)

1. Before choosing or publishing work, inspect the current Story issue, progress artifact, remote branch, and draft PR when present. Announce the last verified pushed checkpoint and the actual next Task or workflow step.
2. If Task 3 is incomplete, another engineer may start Task 3 from the last verified remote checkpoint. Do not display an owner, claim, or in-progress state.
3. If another engineer completed Task 3, tell the returning engineer it is already complete. Reconcile the branch and discard only local edits clearly attributable to that superseded Task. If unrelated or ambiguous edits exist, stop and identify what needs review; do not discard them or advance.
4. After a Task's check passes, its commit is pushed, and matching Story progress is published, show the handoff. After the first such Task, open the draft Story PR and show its link only when confirmed open. Do not pause for a routine choice before the next Task.
5. If issue progress and Git disagree, or publication is only partly confirmed, stop and show the known facts rather than claiming a handoff.
6. After a Story PR merge is verified, close its Story issue and move to the next Story from the current Epic state. After the human-reviewed Epic PR merge is verified, close its Epic issue. Close the Feature issue only after every Epic PR merge is verified. Do not imply native PR-to-issue linking.

## Binding Mockups

The following terminal mockups bind visible hierarchy, copy, and action. Bracketed link text and annotations are placeholders, not literal output. Compact layouts lead; wider layouts add orientation, not new decisions.

### Compact terminal: GitHub repository missing (about 40 columns)

```text
Feature work cannot start

This project has no GitHub repository
connected. No feature was created.

Connect the GitHub repository,
then retry.
```

### Compact terminal: GitHub MCP unavailable

```text
Feature work cannot start

GitHub MCP cannot access the issue
features this work needs.
No feature was created.

Configure GitHub MCP, then retry.
```

If access is lost later, replace “No feature was created” with “This step was not completed” and name the paused action. Do not imply previously published work was lost.

### Compact terminal: Feature created

```text
Feature ready on GitHub

Account settings: [Feature issue]

Next: Define the BRD
```

### Compact terminal: feature document published

```text
BRD published

Feature: Account settings
BRD: [artifact link]

Next: UX design
```

Use the same hierarchy for UX and SDD with the correct next stage. Never display a publication success state before confirmation.

### Compact terminal: publication unconfirmed

```text
BRD was not confirmed on GitHub

The Feature artifact could not be
verified. Next work is paused.

Check GitHub access, then retry.
```

An in-session draft is not described as a saved local file or durable checkpoint.

### Compact terminal: checked Task handoff

```text
Task 3 ready for handoff

Check passed. Commit pushed.
Story progress updated.

Story: [issue link]
Draft PR: [PR link]

Starting Task 4
```

The draft PR line appears only when a PR is confirmed open. If commit, Story progress, or first-Task draft PR publication is unconfirmed, show the partial-publication stop instead of this success state.

### Compact terminal: Task already completed elsewhere

```text
Task 3 is already complete

Another engineer pushed it.
Your unfinished Task 3 edits were
discarded. Other edits remain.

Next: Task 4
```

Use this success state only after safe attribution and branch reconciliation. If the Story has finished, replace “Next: Task 4” with the actual next Story or Epic review step.

### Compact terminal: local work needs review

```text
Task 3 is already complete

Your local edits need review.
Nothing was discarded.
Feature work is paused.

Review local edits, then retry.
```

Provide affected paths in expanded details, not in the primary message.

### Compact terminal: GitHub progress conflicts

```text
Cannot choose the next Task

The Story marks Task 3 complete,
but the branch lacks its commit.
No local edits were discarded.

Review Story and branch, then retry.
```

State the actual observed disagreement; do not always use this example's direction of conflict.

### Compact terminal: verified completion

```text
Epic merged and issue closed

Account settings: [Epic PR]
The Feature issue stays open until
all its Epics are merged.
```

When the last Epic merge is verified, say “Feature complete” and link the Feature issue. Do not close either issue based on a PR merely being ready for review.

### Medium terminal (about 80 columns): resume

```text
Account settings / Save account settings

Last checkpoint: Task 3 — checked and pushed
Next: Task 4

Story: [issue link]   Draft PR: [PR link]
Starting Task 4
```

### Wide terminal (about 120 columns): blocked and resumable states

```text
Feature work cannot start

Missing: GitHub MCP issue-artifact access    |    No feature was created
Next: Configure GitHub MCP, then retry
```

```text
Account settings / Save account settings
Last checkpoint: Task 3 — checked and pushed  |  Next: Task 4
Story: [issue link]                         |  Draft PR: [PR link]

Starting Task 4
```

Wide output must not ask whether to continue a routine next Task. It may show more direct links and checkpoint context, but not a dashboard or new confirmation.

## Terminal-Width Strategy

- **Compact:** one column, short lines, one action at a time; no side-by-side labels or tables.
- **Medium:** keep the same reading order; show Story and PR references together when they fit without wrapping.
- **Wide:** add direct issue, branch, and PR references when they improve orientation. Do not fill width with status panels or metrics.

## Interaction States and Feedback

- **Not ready:** distinguish missing repository connection from missing or unavailable GitHub MCP. Name the blocked action and specific next step. Local setup and maintenance continue normally.
- **Selective read:** say which required Feature, Epic, or Story artifact could not be loaded; never silently substitute stale local content.
- **Stage publication:** show document and Feature link after confirmed publication. An unconfirmed write pauses downstream work.
- **Checked-Task handoff:** show pushed commit and matching Story progress; show the draft PR only when confirmed. Do not ask routine permission to start the next Task.
- **Superseded Task:** distinguish safely discarded Task edits from protected unrelated or ambiguous edits. Announce the next valid step only after reconciliation.
- **Partial publication or conflicting progress:** state known effects and the mismatch, then pause. Never claim a cross-machine checkpoint from incomplete evidence.
- **Issue closure:** show Story, Epic, or Feature closure only after its respective merge condition is verified.
- **Human Epic review:** make the Epic PR and its merged Story PR references easy to find; do not present a pending Epic PR as accepted.

## Accessibility and Copy

Use plain status text, not color, icons, animation, or width alone. Keep screen-reader-friendly linear output, readable wrapping, and keyboard-accessible links or commands. Success and error messages name the consequence and next action without requiring log inspection. Reveal paths and conflicting references only when review is needed.

## Visual Direction and Anti-Bloat

Use Sibu's calm, practical CLI voice. One heading, one next action, and only context needed for the decision. Avoid mode selectors, progress dashboards, decorative boxes, status badges, per-Task essays, and repeated MCP explanations. GitHub Story issues keep compact Task status; detailed plan and progress stay in Story artifacts.

## Risks and UI Authority

GitHub issue artifacts are an external preview surface. Sibu must verify required access and not imply an artifact or issue was updated until confirmed. A session may end before an unpublished draft is saved; do not present that draft as a checkpoint. Git code remains in the normal working tree, but GitHub feature artifacts do not have an on-disk cache.

These mockups are the binding UI goal for later software design and implementation. Changes to visible hierarchy, copy, primary actions, or critical states require a UX revision rather than downstream redesign.
