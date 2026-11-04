# Step: Guard human Epic review and verified issue completion

## Goal

Finish the distributed executor guidance for one evidence-bearing Epic PR that stays open for human review, then close Epic and Feature issues only after their respective merges are independently verified.

## Scope

- Task ID: GFW-S05-T02; Milestone ID: GFW-S05-M02 (human-reviewed Epic and Feature completion); Status: done; Depends on: GFW-S05-T01.
- Story acceptance criteria: AC-02, AC-03, AC-04, AC-05; source decisions: BRD `docs/features/github-feature-work-tracking/brd.md` REQ-08/REQ-10 and AC-05/AC-07; SDD `docs/features/github-feature-work-tracking/sdd.md` §§ Complete Stories, Epics, and Feature; State, Safety, and Operational Visibility; Quality Strategy and Planned Evidence; binding `docs/features/github-feature-work-tracking/ux.md` §§ Resume and hand off Story work; Compact terminal: verified completion; Interaction States and Feedback. On-demand pointers: `templates/skills/ai-implementation-plan-executor/SKILL.md` §§ Present complete Epic for human review; Final response behavior; `docs/features/github-feature-work-tracking/epics/checked-story-delivery/epic_brief.md` §§ Scope; Acceptance Criteria. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/structured-logging/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`.
- In the prompt-owned executor template, require reconciliation of every planned merged Story PR and latest Epic head, the named Epic-level check, one PR with links to all merged Story PRs and actual checks/limits, and readback of its open identity/body/head/base. Keep final acceptance and merge with the human. Missing or ambiguous child links, checks, or remote state stop or are explicitly disclosed as gaps according to the SDD and existing handoff contract; never auto-merge the Epic PR.
- After explicit human merge confirmation, require host readback of the human-reviewed Epic PR merge before Epic issue closure; verify the issue close effect by readback. Close the Feature issue only after all planned Epic PR merges are readback-verified, then verify Feature issue closure. Ambiguous merge/closure effects pause before retry, completion claims, or next-Epic advancement. Do not require native PR-to-issue links.
- Align compact completion guidance with the binding UX mockup: verified Epic PR link and Epic issue closed after verified merge, Feature visibly open until all Epics merge; only then say “Feature complete” with Feature issue link. Medium/wide guidance remains linear and concise. No test-local renderer or Markdown text assertion is evidence of actual agent output or visual fidelity.
- Update `templates/manifest.json` for this template change, preserving only current-version sync notes. Do not write installed local skill files or mutate real GitHub issues during implementation. Flags: none.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/manifest.json`

## Done when

- Task check: after this Task's edits, run `pnpm build`, then `node --test bin/modules/template-catalog/verification-handoff-lifecycle.test.js` as separate direct commands before completion or commit; either failure blocks the Task. Pass: the build succeeds, then current executor guidance installs through init with manifest ownership, doctor is healthy, and sync preserves a customized installed copy against the current checkout; expected evidence: successful build output followed by TAP reporting both distribution/ownership cases passing. This does not prove live agent behavior.
- The shipped guidance keeps one Epic PR open for human review with all verified child Story links, actual check results and limits, and post-write PR body/identity readback; it neither claims acceptance nor merges automatically. Manual source review records the relevant excerpt and maps it to Story AC-02 and BRD REQ-08/REQ-10.
- The shipped guidance orders host-confirmed Epic PR merge → Epic issue close/readback and all Epic PR merges confirmed → Feature issue close/readback, with readback-before-retry and no native-link dependency. Manual source review records the relevant excerpt and maps it to Story AC-03/AC-04; absent bootstrap issues are an explicit evidence limit, not simulated success.
- At the existing Story and final human Epic PR gates, compare the actual available PR/merge evidence and completion message to `ux.md`'s compact verified-completion mockup and interaction states. Record whether the Epic PR is open or merged, the Feature issue is actually open or complete, and what could not be observed; do not label a ready PR as merged or a non-existent bootstrap issue as closed. This human judgment is not replaced by the Task check and does not create a separate QA gate.
- `git diff --check` passes for the scoped edits. After stabilization, run the single final strategy from T01: `pnpm verify`, `pnpm run validate:packed-runtime`, and `node .agents/scripts/check-touched-source-file-lines.mjs`; record actual pass/fail evidence. No deeper property/fuzz/mutation check is added because prompt-only remote behavior has no local executable domain implementation; residual live-host/agent compliance risk remains disclosed at the Epic PR.
