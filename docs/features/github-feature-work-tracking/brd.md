# GitHub Feature Work Tracking Business Requirements Document

## Executive Summary and Business Need

Sibu's planned-feature pipeline needs a shared, authoritative record of feature decisions and checked progress. Repo-local feature files cannot by themselves tell another engineer where a Story stands or which Task can safely begin next. This feature makes the project's GitHub repository the home for planned feature artifacts and progress, including when one engineer works alone. A checked Task becomes a cross-machine handoff only after its code and matching Story progress are published. Local workflow setup, maintenance, and narrow fixes remain available without GitHub.

## Objectives and Measurable Success

- OBJ-01 — Enable a cross-machine handoff: after Engineer A completes and pushes a checked Task, Engineer B can inspect the same repository's GitHub Story and remote work state, then start the next Task without A's local files or a separate explanation. Evaluate with a two-engineer, two-machine feature-work scenario.
- OBJ-02 — Give every planned feature one clear GitHub source of truth while keeping local setup and maintenance independent of GitHub. Evaluate whether feature work stops before its first artifact when required GitHub access is unavailable, while `sibu init`, `doctor`, `sync`, and narrow fixes remain usable.
- OBJ-03 — Make GitHub feature work reviewable through a Feature → Epic → Story issue hierarchy, authoritative feature documents, an early draft Story PR, and the final human-reviewed Epic PR. Evaluate an Epic containing multiple Stories from feature definition through issue closure.

## Stakeholders and Needs

- **Engineers using Sibu**, including solo engineers, need a reliable feature record and clear progress context without reconstructing it from one machine.
- **Collaborating engineers** need checked work published at Task boundaries, visibility into the next available Task, and protection from overwriting or losing unrelated local edits when work overlaps.
- **Epic reviewers** need the Feature's published BRD, UX, and SDD, the Epic's Story outcomes, and the merged Story PRs available from the GitHub work context.

## Scope and Exclusions

**In scope:** GitHub as the sole destination for planned feature-specific artifacts and progress; a GitHub repository and usable GitHub MCP before the first feature artifact; a Feature issue with native Epic and Story sub-issues; BRD, UX, and SDD artifacts on the Feature issue; Story plan and progress artifacts; compact Task status inside Story issues; selective MCP reading without an on-disk artifact cache; checked-Task publication and safe cross-machine resumption; an early draft Story PR; verified Story, Epic, and Feature issue closure; and the existing final human Epic PR review.

**Out of scope:** a local-only planned-feature mode, mode selection or switching, migration, backfill, and compatibility with previous feature files; GitHub Projects; separate Task issues; native PR-to-issue linking; in-progress Task ownership or claims; cross-machine transfer of uncommitted edits; an on-disk feature-artifact cache; and issue-artifact version history. Project-wide Product Vision, Business Domain Model, Capabilities Map, and SAD remain repo-local. `sibu init`, `doctor`, `sync`, and narrow fixes do not require GitHub. An interrupted, unpublished planning draft may need to be redone.

## Requirements

- REQ-01 — Type: quality; Objectives: OBJ-02. Before planned feature work creates its first artifact, require the project's GitHub repository and configured, usable GitHub MCP access to issues, native sub-issues, and issue artifacts; stop dependent work when access is missing without falling back to local feature tracking. Keep local setup, maintenance, and narrow fixes available. (RULE-01)
- REQ-02 — Type: functional; Objectives: OBJ-02, OBJ-03. Create one Feature issue for planned feature work, with native Epic sub-issues and Story sub-issues under each Epic; keep Epic and Story definitions in their issues, Story plans and progress in issue artifacts, and checked Tasks compactly inside Story issues, without duplicate local feature-planning files. (RULE-02)
- REQ-03 — Type: functional; Objectives: OBJ-03. Publish the BRD, UX, and SDD as authoritative Feature issue artifacts when each stage finishes; downstream work reads the published versions, not unpublished drafts. (RULE-03)
- REQ-04 — Type: functional; Objectives: OBJ-01, OBJ-03. Record completed Task status, check evidence, commit reference, and next-work context in the Story issue and its plan/progress artifacts without filling the issue body with detailed per-Task logs. (RULE-04)
- REQ-05 — Type: functional; Objectives: OBJ-01. Publish each completed, checked Task commit and matching Story progress before treating it as a cross-machine handoff point; verify ambiguous publication before claiming success. (RULE-04)
- REQ-06 — Type: functional; Objectives: OBJ-01. Before resuming or publishing work, compare the remote branch, issue, and draft PR state when present; if an incomplete Task was finished elsewhere, reconcile with current workflow state and continue with the appropriate next Task, Story, or Epic handoff. (RULE-05)
- REQ-07 — Type: quality; Objectives: OBJ-01. Discard superseded local edits only when confidently attributable to that Task; preserve unrelated or ambiguous edits and stop when Git and issue progress conflict. (RULE-05)
- REQ-08 — Type: functional; Objectives: OBJ-03. Open an in-progress Story's PR as a draft after its first checked Task is pushed; retain the Epic PR's links to all merged Story PRs, and close Story, Epic, and Feature issues only after their respective merge-completion conditions are verified, without requiring native PR-to-issue links. (RULE-06)
- REQ-09 — Type: quality; Objectives: OBJ-01, OBJ-03. Read only the relevant published feature artifacts through GitHub MCP into agent session context, without an on-disk feature-artifact cache or unnecessary repeated reads. Do not represent unpublished drafts as durable progress. (RULE-03)
- REQ-10 — Type: quality; Objectives: OBJ-03. Keep final Epic acceptance under human review while preserving planned Task and Story checks and stopping for unresolved material decisions, unsafe integration, or missing required access. Separate behavioral QA and disposable-repository integration checks are not prerequisites for this version. (RULE-07)

## Business Rules

- RULE-01 — GitHub is the sole source of truth for planned feature-specific artifacts and progress. The project's GitHub repository and usable GitHub MCP are required before the first feature artifact; unavailable access stops dependent work, not local setup or maintenance.
- RULE-02 — One planned Feature has one authoritative Feature issue. Its Epics and Stories form native sub-issue levels. Tasks remain within their Story issue, not separate issues. Project-wide documents remain repo-local.
- RULE-03 — BRD, UX, and SDD artifacts are published on the Feature issue at their stage boundaries. Agents read relevant artifacts into session context without an on-disk cache; an unpublished interrupted draft may need to be redone.
- RULE-04 — Only a checked and pushed Task with matching Story progress is a cross-machine handoff point. An incomplete Task may be restarted by another engineer from the last verified remote checkpoint, without an in-progress claim.
- RULE-05 — Resumption must follow observed remote work state. Superseded Task edits may be discarded only when clearly attributable; unrelated or uncertain local work is protected, and conflicting evidence stops continuation.
- RULE-06 — A Story opens a draft PR after its first checked Task is pushed. A Story issue closes after its Story PR is verified merged into the Epic branch; an Epic issue closes after its human-reviewed Epic PR is verified merged; the Feature issue closes after every Epic PR is verified merged. Native PR-to-issue linking is not required.
- RULE-07 — Planned Task and Story checks remain required. Material ambiguity, failed checks, unsafe integration, or consequential decisions stop unattended progress; final Epic acceptance remains human-controlled. Separate behavioral QA is outside this delivery workflow.

## Business Acceptance Criteria

- AC-01 (REQ-01) — Without a GitHub repository or required GitHub MCP capability, planned feature work stops before creating its first feature artifact and does not create local substitute progress. `sibu init`, `doctor`, `sync`, and narrow fixes remain available.
- AC-02 (REQ-02, REQ-03, REQ-04) — A Feature issue shows Epic sub-issues and published BRD/UX/SDD artifacts; each Epic shows Story sub-issues; each Story shows compact Task status and provides its plan and progress artifacts, without duplicate local Epic, Story, plan, or progress files.
- AC-03 (REQ-05) — After Engineer A checks, commits, and pushes Task 3 and publishes matching Story progress, Engineer B on another machine can verify the Story record and remote branch, then begin Task 4 without A's local files or explanation. If publication is ambiguous, the agent does not claim the handoff without readback.
- AC-04 (REQ-06, REQ-07) — If Engineer A leaves Task 3 unfinished and Engineer B completes and pushes it, A's returning agent detects completion, discards only clearly attributable Task 3 edits, reconciles with current remote state, and continues from appropriate next work; ambiguous or unrelated edits remain untouched.
- AC-05 (REQ-08) — After the first checked Task is pushed, the in-progress Story has a draft PR. The Epic PR links all merged Story PRs. Story and Epic issues close only after their respective PR merges are verified, and the Feature issue closes only after every Epic PR merge is verified. Final Epic acceptance remains human-controlled.
- AC-06 (REQ-03, REQ-09) — Each completed BRD, UX, and SDD stage publishes its Feature issue artifact before downstream work uses it. A new agent reads only needed artifacts through MCP without creating an on-disk artifact cache; an interrupted unpublished draft is not represented as completed work.
- AC-07 (REQ-10) — Planned Task and Story checks and the final human Epic PR review remain in place, while the workflow does not require separate human QA, behavioral QA, or disposable-repository integration checks.

## Product Vision Fit

The feature advances Sibu's goal of small, checked, reviewable AI work with fewer routine interruptions. GitHub provides a shared home for planned feature work without making it necessary for local setup, maintenance, or narrow fixes. Engineers retain final Epic acceptance and control over consequential decisions.

## Business Domain Model Fit

The **Feature Issue** holds authoritative BRD, UX, and SDD artifacts. The **GitHub Issue Hierarchy** organizes Feature, Epic, Story, and compact Task progress around the existing Story and Epic PR lifecycle. **Feature Artifact Published**, **Task Handoff Published**, and **Task Superseded** describe durable stage and cross-machine transitions without an in-progress ownership state. Project-wide artifacts remain repo-local.

## Capability Coverage

- **AI-Augmented Development Pipeline:** require GitHub readiness; place feature artifacts in GitHub; organize Feature, Epic, and Story work; publish stage-complete documents and checked-Task handoffs; read artifacts selectively; resume across machines; reconcile superseded local work safely; integrate verified Stories; and close completed GitHub issues.
- **MCP / Tool Configuration Support:** establish GitHub readiness for planned feature work while keeping credentials out of Sibu-managed files and local setup independent of GitHub.
- **Source Control Hosting (external):** provide the repository, issues, sub-issues, issue artifacts, PRs, checks, and review surface that Sibu coordinates but does not own.
