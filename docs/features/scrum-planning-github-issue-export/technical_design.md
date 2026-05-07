# Technical Design: Scrum Planning GitHub Issue Export

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/scrum-planning-github-issue-export/feature_brief.md`
- Delegated skills: `sibu-template-change`, `ai-prompt-engineer-master`
- External reference: GitHub REST sub-issues docs: <https://docs.github.com/en/rest/issues/sub-issues?apiVersion=2026-03-10>

## Summary

Implement this as a Scrum planner skill/template enhancement, not a new Sibu CLI command. After the skill writes local Epic and User Story docs, it should optionally use available GitHub MCP tools to create GitHub Issues in the current repository. The exported hierarchy is create-only: Epic issues are created first, User Story issues are created next, and each User Story issue is attached to its parent Epic using GitHub native sub-issues.

## Existing Context

- `templates/skills/scrum-master-planner/SKILL.md` owns the reusable Scrum planner behavior shipped by Sibu.
- `.agents/skills/scrum-master-planner/SKILL.md` is this repository's installed copy and should be updated if the repo should immediately use the new guidance.
- `templates/manifest.json` must be bumped for any template change.
- Existing GitHub MCP tools can expose issue creation and native sub-issue mutation. The native sub-issue API requires the child issue `id`, not its issue number, when adding a child to a parent.
- The currently discoverable GitHub MCP write tools include issue creation/update and sub-issue mutation. Label creation support may vary by MCP tool exposure, so the skill must fail before creating issues if required label creation cannot be performed.

## Proposed Design

### Scope of implementation

Only change Scrum planner guidance and template metadata:

- Update `templates/skills/scrum-master-planner/SKILL.md`.
- Update `.agents/skills/scrum-master-planner/SKILL.md` for the working repository copy.
- Update `templates/manifest.json`:
  - bump global `templateVersion`
  - bump `skills/scrum-master-planner/SKILL.md`
  - replace its change notes with this version's user-facing note

No Sibu runtime module should be added for this MVP. The feature runs inside the agent skill flow after planning artifacts are written.

### Scrum planner flow change

Add a new post-write section to the Scrum planner skill after coverage/boundary checks and before final response behavior.

The section should instruct the agent to:

1. Finish writing all local Epic and User Story Markdown files first.
2. Check whether GitHub MCP issue-writing and sub-issue-writing tools are available in the current agent session.
3. If GitHub MCP tools are unavailable, do not mention export as an action; end with the normal Scrum planner final response.
4. If GitHub MCP tools are available, resolve the current repository from the local Git remote, using only the current repo. Do not ask the user for a different repository.
5. Ask one explicit opt-in question before any GitHub mutation.
6. If the user declines, perform no GitHub mutations and end with the normal local planning summary.
7. If the user accepts, create a fresh GitHub issue set every time. Do not search for duplicates or update existing issues.

### Repository resolution

The skill should use the local repository's GitHub `origin` remote as the target repository.

Supported remote shapes:

- `git@github.com:<owner>/<repo>.git`
- `https://github.com/<owner>/<repo>.git`
- `https://github.com/<owner>/<repo>`

If the current repo cannot be resolved to a GitHub `owner/repo`, the export should fail before creating labels or issues.

### GitHub export sequence

Use a fail-fast sequence to avoid creating issues when prerequisites are known to be missing:

1. Resolve `owner` and `repo` from the current local repo.
2. Ensure the required labels exist or can be created:
   - `epic`
   - `user-story`
   - `sibu-generated`
3. If any required label is missing and no GitHub MCP label-creation capability is available, stop before creating issues and explain that label creation is required but unavailable in the current MCP toolset.
4. Create each Epic issue with labels `epic` and `sibu-generated`.
5. Create each User Story issue with labels `user-story` and `sibu-generated`.
6. For each User Story, attach it as a native sub-issue to its parent Epic issue.
7. Report created issue numbers or URLs.

The export is not atomic. If a later issue or sub-issue operation fails, the skill should report the partial result honestly and must not claim success. It should not attempt rollback in MVP.

### Issue body conventions

Keep issue bodies concise and source-grounded. Include local doc paths for traceability, but do not edit those local docs.

Epic issue body should include:

- generated-by-Sibu note
- source Epic doc path
- source feature brief and technical design paths when useful
- Epic summary/scope/acceptance criteria from the Epic brief

User Story issue body should include:

- generated-by-Sibu note
- source Story doc path
- parent Epic title/path
- user story statement
- acceptance criteria
- validation notes when present

Do not include hidden duplicate-detection markers in MVP because duplicate detection is explicitly out of scope.

### Native sub-issue requirement

Use GitHub native sub-issues only. The GitHub REST API documents `POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues` with body `sub_issue_id`, where `issue_number` is the parent issue number and `sub_issue_id` is the child issue ID.

Implementation guidance for agent instructions:

- Preserve the created child issue `id` from the issue creation result.
- Use the parent Epic issue number plus child issue ID for the sub-issue mutation.
- If the available MCP issue creation result does not expose the child issue ID required by the sub-issue tool, fail clearly instead of using issue number as a substitute.
- Do not fall back to Markdown checklists, links, GitHub Projects, or milestones.

### Prompt wording constraints

The skill addition should be short and operational. It should not turn the Scrum planner into GitHub documentation. It should specify:

- when to ask
- when not to ask
- current-repo-only rule
- labels and issue mapping
- native sub-issue requirement
- create-only/no duplicate detection rule
- local files remain unchanged
- fail-fast behavior for missing MCP capabilities

### Deep Module boundaries

- **Template Catalog and Rendering**: owns the template and manifest change.
- **Workflow Target Planning** and **MCP Server Selection Management** are context only. Do not change selectable MCP server state, catalog entries, config rendering, or CLI MCP commands for this MVP.

## Validation

- Run `pnpm verify`.
- Inspect rendered/installed Scrum planner skill text for the new post-planning GitHub export guidance.
- Verify `templates/manifest.json` versions and change notes follow Sibu template-change rules.
- Manual prompt review: confirm the skill still says it does not own general project-management automation, while allowing this explicitly scoped post-planning export.
- Optional live validation in a test GitHub repo: use the Scrum planner skill with GitHub MCP available, confirm labels/issues/sub-issues are created, and confirm local Markdown files remain unchanged.

## Risks / Open Questions

- GitHub MCP tool exposure may differ across agents. The skill must fail before mutation when required label creation or sub-issue mutation is unavailable.
- Some issue creation tools may return issue numbers but not issue IDs. Native sub-issue attachment needs the child issue ID; this must be preserved or the export must fail.
- The export is non-atomic. Partial GitHub creation is possible if a later operation fails; MVP should report partial results rather than attempting rollback.
- Always creating fresh issues is intentionally simple but can create duplicates on repeated confirmation.
