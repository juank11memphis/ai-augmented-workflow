# Step: Gate planned feature work before its first artifact

## Goal

Make installed, prompt-owned feature guidance distinguish a missing project GitHub remote from missing or unusable GitHub MCP capabilities before any Feature issue or artifact is created.

## Scope

- Task ID: GFW-S01-T01; Milestone ID: GFW-S01-M01 (safe start and authoritative publication); Status: done; Depends on: none.
- Story-plan view: Story GFW-S01, `docs/features/github-feature-work-tracking/epics/shared-feature-records/stories/01-publish-authoritative-feature-documents.md`. Sources: `docs/features/github-feature-work-tracking/epics/shared-feature-records/epic_brief.md`, `docs/features/github-feature-work-tracking/brd.md` (REQ-01, REQ-03, REQ-09; AC-01, AC-06), `docs/features/github-feature-work-tracking/sdd.md` (Ownership and Boundaries; first Mermaid flow under Start and publish a feature stage; State, Safety, and Operational Visibility; Quality Strategy and Planned Evidence), `docs/features/github-feature-work-tracking/ux.md` (Start planned feature work; Publish feature documents; Binding Mockups). Selected architecture: `.agents/skills/command-pattern/SKILL.md`; no new Deep Module or CLI delivery handler.
- Coverage: M01/T01 → Story AC-01 (readiness and local independence); M01/T02 → AC-02 (one Feature issue and stage publication); M02/T03 → AC-03 and AC-04 (selective reads and uncertain effects); M02/T04 → AC-05 (terminal states). M01 evidence: focused readiness and publication contract tests. M02 evidence: focused readback and output tests, then one stabilized final validation.
- Task/status list: T01 done → T02 pending → T03 pending → T04 pending. Flags: none in Epic and Story. Story-local append-only progress log: `docs/features/github-feature-work-tracking/epics/shared-feature-records/stories/01-publish-authoritative-feature-documents.impl_plan/progress.jsonl`; each later execution entry records Task ID, outcome, actual check result, commit reference when present, blocker, and gotchas. Do not create it during planning or claim execution.
- Durable conventions: each checked Task owns one scoped commit after its check and all Done-when evidence; plan review, branch/PR execution, and final Story review remain with the main agent. The Story PR reports actual check evidence and the SDD's no-live-MCP/no-live-model limit. No Feature Decision ID applies. Do not modify prior product artifacts. Do not treat static prompt tests or fake scenarios as proof of live agent behavior.
- Story acceptance criteria: AC-01; source decisions: `brd.md` REQ-01/AC-01 and SDD first Mermaid flow require remote identity then same-repository usable MCP issue, native sub-issue, and issue-artifact access before creation; `agent-tool-configuration` only renders safe config; local setup/maintenance and narrow fixes remain independent. On-demand pointers: `sdd.md` Ownership and Boundaries, Start and publish a feature stage, Quality Strategy and Planned Evidence; `ux.md` Binding Mockups, Compact terminal: GitHub repository missing and GitHub MCP unavailable. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`.
- In the prompt-owned pipeline routing and relevant stage-entry guidance, state a single ordered pre-artifact contract: establish the current project's GitHub remote, then verify same-repository usable MCP issue, native sub-issue, and issue-artifact operations; separate missing-remote and missing-MCP blocked outcomes with a specific next action and zero feature writes. After successful Feature/SDD publication, routing must also stop before unsupported downstream GitHub Epic/Story planning rather than write local substitutes. Keep authorization at host action boundaries; rendered MCP config is not proof of access.
- Do not add a feature-tracking mode, GitHub probe to `init`/`doctor`/`sync`, local feature fallback, new runtime module, or exporter-skill dependency. If an executable CLI change proves necessary, stop for scope review rather than silently creating a delivery engine; any approved CLI slice must follow command/result → ports → handler with fake-port tests → adapter → thin entrypoint.

## Files

- `templates/AGENTS.md`
- `templates/skills/business-requirements-writer/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-feature-readiness.test.ts`
- `src/entrypoints/cli/create-program.test.ts` (only if a local-command regression assertion is needed there)

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-feature-readiness.test.js`; pass: build and focused tests exit 0, including deterministic missing-remote, missing-MCP/partial-capability, no-create/no-local-fallback, same-repository, local-command-independence, and successful Feature/SDD publication followed by unavailable downstream GitHub workflow assertions; expected evidence: named passing cases, zero fake issue/artifact writes in pre-artifact blocked scenarios, and a clear downstream stop with no local Epic/Story substitute in the post-publication scenario. The test is a guidance/entrypoint contract check, not a live-agent claim.
- The fake capability matrix covers issue creation/read, native sub-issues, and issue-artifact read/write separately; config presence alone never counts as usability. Existing `init`, `doctor`, `sync`, and narrow-fix entrypoints remain callable without a GitHub prerequisite.
- Any changed managed template gets a global and per-template version bump and current-version user-facing sync note in `templates/manifest.json`; no local Sibu-managed file is overwritten.
- Touched source files are kept at or below 500 lines; `node .agents/scripts/check-touched-source-file-lines.mjs` is required in final validation. Existing `templates/AGENTS.md` is short; if a touched source test or module approaches the limit, split by cohesive contract rather than mechanical line chopping.
