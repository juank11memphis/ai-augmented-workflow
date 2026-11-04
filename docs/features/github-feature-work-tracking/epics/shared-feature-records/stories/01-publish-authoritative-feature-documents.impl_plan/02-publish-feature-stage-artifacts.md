# Step: Publish stage-complete documents on one Feature issue

## Goal

Make the BRD, UX, and SDD stage guidance create or find one Feature issue and publish each completed document there before downstream work proceeds.

## Scope

- Task ID: GFW-S01-T02; Milestone ID: GFW-S01-M01 (safe start and authoritative publication); Status: done; Depends on: GFW-S01-T01.
- Story acceptance criteria: AC-02; source decisions: `docs/features/github-feature-work-tracking/brd.md` REQ-03/AC-06 and REQ-01, SDD first Mermaid flow and Ownership and Boundaries. Feature issue is the stable parent/index; BRD, UX, SDD are stage-complete issue artifacts; completed publication precedes downstream use. On-demand pointers: `sdd.md` Start and publish a feature stage and State, Safety, and Operational Visibility; `ux.md` Publish feature documents and Binding Mockups, Feature created and feature document published. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/typescript/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`, `.agents/skills/ux-expert/SKILL.md`.
- Update the prompt-owned BRD, UX, and SDD stage guidance with a common, explicit issue/artifact identity and publication contract: find the intended Feature issue before creating one; after each stage's existing authoring and user-control gates, publish the completed document through GitHub MCP; read back/confirm its issue artifact identity and link before reporting completion or allowing the next stage.
- Keep the existing discovery, interview, source, SAD/UX, and user-directed stage gates. The binding UX Feature-created and publication-success messages name the issue/artifact link and next stage; after confirmed SDD publication, handoff guidance must stop if downstream GitHub Epic/Story planning is unavailable, without producing local Epic/Story substitutes or implying hierarchy work was already done.
- Do not create local substitute feature planning files, on-disk feature-artifact cache, issue-artifact version history, Epic/Story issues, or a Sibu CLI delivery engine. Scope is prompt guidance/templates and deterministic contract evidence, not live GitHub mutation.

## Files

- `templates/skills/business-requirements-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/software-design-writer/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-feature-stage-publication.test.ts`

## Done when

- Task check: `pnpm build` then `node --test bin/modules/template-catalog/templates-feature-stage-publication.test.js`; pass: build and focused tests exit 0 with named deterministic fake-MCP scenarios for one existing-or-new Feature issue, ordered BRD/UX/SDD artifact publication, confirmed artifact identity before next-stage read, and no duplicate Feature creation; expected evidence: passing contract cases and fake operation traces showing find-before-create and readback-before-success. These validate the stated guidance contract, not live agent obedience or GitHub semantics.
- Each stage's success path preserves its existing user-directed progression and only announces an issue or artifact after confirmed publication; the stage-entry guidance does not claim a draft is durable. A deterministic contract case confirms that successful Feature/SDD publication followed by unavailable downstream GitHub workflow yields a clear stop and no local Epic/Story output, without implementing GFW-S02. Story AC-02 and BRD REQ-03/AC-06 are traceable in the focused assertions.
- `templates/manifest.json` records global/per-changed-template version bumps and current-version sync notes. Keep each touched skill source coherent; `business-requirements-writer` is already 354 lines, so add only concise stage handoff guidance and split cohesive material rather than exceeding 500 lines.
