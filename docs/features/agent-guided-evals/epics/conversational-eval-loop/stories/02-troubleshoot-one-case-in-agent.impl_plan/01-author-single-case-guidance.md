# Step: Author bounded single-case agent guidance

## Goal

Create a separate mandatory agent-guided-evals skill that gives Codex and Claude Code one shared, approval-gated troubleshooting contract over the AGE-US-01 headless CLI.

## Scope

- Task ID: AGE-US-02-T01; Milestone ID: AGE-US-02-M01 (reviewable single-case workflow guidance); Status: done; Depends on: AGE-US-02-T00.
- Plan overview and append-only progress conventions are in first ordered step `00-expose-failed-assertion-locators.md`; preserve prior human acceptance with warning and pre-edit T01 blocker in `progress.log`. This revised exact plan needs fresh independent review before execution; user-deferred behavioral QA still gates Story integration.
- Story acceptance criteria: AC-01–AC-04; BRD `docs/features/agent-guided-evals/brd.md` REQ-01–REQ-06, REQ-08–REQ-09, RULE-01–RULE-04. Source decisions: separate from eval-authoring; use existing `sibu evals` JSON operations and host reasoning/editing; one active failure; conversational approval is not an enforced Sibu authorization; no new Sibu mutation endpoint, engine, UI, or provider dependency. On-demand pointers: SDD §§Architecture and responsibilities, Command contracts and boundaries, Main interaction and verification loop (sequence diagram), Safety/state/failure behavior, Quality strategy and planned verification, Risks and tradeoffs; Story §§In Scope, Acceptance Criteria; `templates/skills/eval-authoring/SKILL.md` for negative boundary. Applicable skills: `.agents/skills/clean-code/SKILL.md`, `.agents/skills/command-pattern/SKILL.md`, `.agents/skills/ai-prompt-engineer-master/SKILL.md`, `.agents/skills/sibu-template-change/SKILL.md`.
- In `templates/skills/agent-guided-evals/SKILL.md`, define natural troubleshooting trigger and the exact installed CLI JSON discovery → chosen suite/case → compatible MUE/judge choice → terminal single-case run → failed attempt's `failedAssertionIds` locator from T00 run/unselected result JSON → bounded selected-assertion result path. Keep case ID, attempt number, and assertion ID together; selected result currently accepts attempt 1. If locators are absent/unavailable, stop honestly rather than infer an ID from suite JSON or bulk artifacts. Keep the agent's own model distinct from MUE/judge; use actual flags and JSON outcome semantics, not guessed syntax.
- Define concise diagnosis with observed run ID, active assertion, likely cause, uncertainty and possible fixes; distinguish assertion failures from credential, runner, judge, config, partial/interrupted and missing-artifact blocks. For one concrete proposed fix give rationale, expected effect and exact project-root paths, wait for explicit approval, reject secret/credential edits and declined fixes, and preserve pre-existing edits.
- Define pre-edit working-tree baseline, native host edit only after approval, post-edit changed-file/delta report, and hard stop on unexpected or indistinguishable concurrent changes before any rerun. After a scoped edit, automatically rerun the case once; compare the active assertion in the fresh run, return to that failure with new options if still failing, and do not claim other checks/suite success. No repeated reruns merely to find a pass or second fix without a new decision. Explicitly decline guided full-suite/multi-case sessions until AGE-US-03 while leaving AGE-US-01's complete CLI full-suite run-and-inspect available.
- Do not put live-model tests in routine unit tests or imply prompt text enforces approval. Keep prompt concise without dropping decision and failure boundaries.
- In this same Task as the new template, update `templates/manifest.json`: bump global `templateVersion` and the new skill's template version/entry, with current-version user-facing `sibu sync` notes. Do not defer this metadata to T02 or bump T02's route template before its edit.

## Files

- `templates/skills/agent-guided-evals/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog/templates-agent-guided-evals.test.ts` (focused static guidance-contract tests; coordinate ownership with T02/T03 rather than duplicate test files)

## Done when

- Task check: `pnpm run build`, then `node --test bin/modules/template-catalog/templates-agent-guided-evals.test.js`; pass: focused static tests assert the shared skill consumes T00's case/attempt/failed-assertion locator, uses selected bounded result, covers single-case limit, approval/path/delta/rerun/blocker instructions, and exposes no CLI mutation shortcut; expected evidence: passing named tests and compiled skill-contract test.
- The new skill template and its manifest entry/version, global templateVersion bump, and current-version user-facing sync note land together; tests assert metadata matches content. T02 owns only its later changed template's version/note and its own global bump.
- The skill uses the actual AGE-US-01 CLI contract and no independent runner or browser path. Static tests prove text contracts only, not Codex/Claude behavior (SDD §Quality strategy, deterministic unit tests; Story AC-01–AC-04).
- Human-judgment limit: AC-01–AC-04 cannot be marked behaviorally verified by this check; isolated disposable live-agent evals need separate explicit authorization. No routine Task check may call a live model.
