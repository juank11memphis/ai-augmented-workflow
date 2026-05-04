# Contract-Based AI Development Pipeline Feature Brief

## Summary

Sibu should refactor its AI Development Workflow Pipeline templates into a stricter contract-based system. Users can still choose not to use the pipeline, but when they do, each pipeline stage must clearly enforce what it needs, what it writes, when it stops, and what it must not do. The goal is a more reliable, LLM-friendly pipeline that preserves quality, prevents stage confusion, reduces redundant context, and keeps users moving through product-to-code work in small, responsible steps.

## Product Vision Fit

This feature supports Sibu's promise to turn scattered AI development practices into a practical workflow. It strengthens the product's bias toward small work, explicit boundaries, human control, and high-quality output. It also reinforces Sibu's position as a guide rather than an autopilot: the pipeline can be opinionated when users opt into it, but it should never force itself onto projects that choose another path.

The feature should make Sibu feel more trustworthy and grounded. Agents should stop when prerequisites are missing, redirect users to the right stage, and avoid silently inventing upstream product decisions. The workflow should feel stricter without becoming bureaucratic.

## Product Context

- **AI Development Pipeline:** Primary context. This feature changes how the product-to-code pipeline stages enforce prerequisites, boundaries, handoffs, and artifact ownership.
- **Guidance Library:** Supporting context. The change is delivered through reusable pipeline skill templates and their instruction contracts.

This feature does not belong to Workflow Adoption & Maintenance because it does not change `sibu init`, `sibu doctor`, `sibu sync`, or repository sync behavior.

## User / Customer Problem

Sibu's pipeline exists to help developers move from product intent to implementation without handing vague goals to AI. Today, pipeline skills can be improved by making their contracts more consistent and strict. Without stronger contracts, agents may read too much, skip required upstream artifacts, create downstream artifacts too early, blur stage responsibilities, or continue from incomplete prior work.

Users need the pipeline to be clear enough that agents know exactly when to proceed, when to interview the user, and when to stop and redirect to another stage.

## Business Goal

Increase trust in Sibu's AI Development Workflow Pipeline by making each stage more predictable, enforceable, and efficient for LLM use while preserving Sibu's quality bar.

The feature should help users feel that the pipeline gives them speed with structure: fewer ambiguous agent responses, fewer invented assumptions, and cleaner handoffs between planning, design, and implementation work.

## Target User / Scenario

This feature is for solo engineers and teams who choose to use Sibu's opinionated AI Development Workflow Pipeline:

product vision → product context map → feature brief → technical design → optional UX design → epics and stories → AI implementation planner → AI implementation executor.

The target scenario is a developer asking an agent to perform one pipeline stage. The agent should know which artifacts it must read, what it is allowed to write, what to do when prerequisites are missing, and which adjacent work it must avoid.

## Proposed Experience

When a user invokes a pipeline skill, the skill follows a consistent contract shape:

1. **What this skill needs** — the required input artifacts and prerequisites.
2. **What this skill writes** — the artifact path or paths the skill may create or update, including necessary supporting directories.
3. **When this skill stops** — missing inputs, wrong-stage requests, incomplete prior artifacts, unclear intent, or scope mismatch.
4. **What this skill must not do** — adjacent stages, downstream artifacts, implementation work too early, or source-of-truth reinterpretation outside its responsibility.

If required inputs are missing, the skill stops immediately, names the missing artifact, names the skill or stage the user should run first, and does not draft, infer, or create substitute content.

If the user intent is unclear but belongs to the current stage, the skill interviews the user one focused question at a time until it has enough information to write its own artifact. It should not require a final confirmation summary before writing. Once it has enough information, it writes the artifact and final-answers only with the file path.

If the user asks for the wrong pipeline stage, the skill stops and redirects to the correct skill instead of partially helping.

If a prior artifact exists but is obviously incomplete or invalid in a way its owning stage should have handled, the skill stops and sends the user back to that owning stage. Downstream stages may read prior artifacts and ask clarifying questions, but they must not modify prior-stage artifacts.

## Context Access Policy

Each pipeline stage should read only the artifacts it must read to satisfy its contract and produce high-quality output. This is context minimalism, not context starvation.

The pipeline should avoid redundant prompt weight, but never compromise quality to save tokens. If an artifact is required for correctness, the skill must read it. If a prior stage already translated relevant context into a downstream artifact, later stages should trust that translation instead of rereading the original source.

Required implications:

- Feature brief reads the product vision and Product Context Map.
- Technical design reads the feature brief and Product Context Map.
- Technical design decides which Product Contexts apply and translates those product contexts into implementation boundaries appropriate for the selected architecture.
- Epics and stories read the feature brief and technical design.
- AI implementation planner reads the story and technical design; it does not reread the Product Context Map by default.
- AI implementation executor reads the implementation plan step, technical design, and relevant repo files; it does not reread the full upstream chain by default.
- Downstream stages trust the technical design as the implementation boundary source of truth. If that translation is missing or inconsistent, they stop instead of reinterpreting the Product Context Map.

The goal is enough context for excellent work with no unnecessary context duplication. Cost matters, but Sibu should avoid false economy: spending slightly more context to preserve quality is better than saving tokens and producing fragile work.

## MVP Scope

- Update all AI Development Workflow Pipeline skill templates to include the shared `## Pipeline Contract` structure:
  - `### What this skill needs`
  - `### What this skill writes`
  - `### When this skill stops`
  - `### What this skill must not do`
- Apply the contract to these pipeline-stage templates:
  - `product-vision-writer`
  - `product-context-map-writer`
  - `feature-brief-writer`
  - `technical-design-writer`
  - optional UX design writer if it exists and the work is UI-related
  - `scrum-master-planner`
  - `ai-implementation-planner`
  - `ai-implementation-plan-executor`
- Standardize missing-input behavior across all pipeline stages.
- Standardize wrong-stage behavior across all pipeline stages.
- Standardize incomplete-prior-artifact behavior across downstream stages.
- Remove required final confirmation summaries before artifact writing where they exist.
- Preserve one-question-at-a-time interview behavior for unclear current-stage intent.
- Make context access explicit for each stage so it reads only what it needs while preserving quality.
- Ensure each stage writes only its own artifact or artifacts plus necessary supporting directories.
- Ensure downstream stages do not modify prior-stage artifacts.

## Out of Scope

- Changing `sibu init`, `sibu doctor`, `sibu sync`, or any other CLI behavior.
- Building a runtime pipeline engine or state machine.
- Adding formal schema validation for artifacts.
- Adding automated evals.
- Creating new pipeline stages.
- Implementing a new UX design writer if one does not already exist.
- Adding lightweight tests or evals for pipeline contract behavior.
- Changing supporting skills such as `clean-code`, `typescript`, or `command-pattern`.
- Automatically migrating existing user-authored docs.
- Turning Sibu into an AI IDE, agent runtime, model selector, or autonomous coding system.

## Success Signals

- Pipeline skills reliably stop when required artifacts are missing and clearly tell the user which skill to use next.
- Pipeline skills redirect wrong-stage requests instead of producing mixed or premature artifacts.
- Each pipeline stage writes only its own artifact or artifacts.
- Later implementation stages trust the technical design instead of rereading and reinterpreting the Product Context Map.
- Skills ask focused questions when current-stage intent is unclear, then write the artifact without spending tokens on confirmation summaries.
- Prompt/template length stays controlled by avoiding duplicated source-of-truth content and redundant upstream reads.
- The pipeline feels stricter, clearer, and more reliable without feeling slow or bureaucratic.

## Business-Level Acceptance Criteria

- Each pipeline-stage template includes a clear `## Pipeline Contract` section with the four required contract parts.
- Each pipeline-stage template names its required inputs and output path or path pattern.
- Each pipeline-stage template tells the agent to stop when required inputs are missing and to direct the user to the correct previous skill.
- Each pipeline-stage template tells the agent to stop and redirect when the user requests work owned by another pipeline stage.
- Each downstream template tells the agent not to modify prior-stage artifacts.
- The technical design template requires translating Product Context Map responsibilities into architecture or implementation boundaries.
- The implementation planner and executor templates do not require reading the Product Context Map by default.
- Pipeline templates preserve interview behavior for unclear current-stage intent.
- Pipeline templates do not require a final user confirmation summary before writing their owned artifact.

## Risks / Tradeoffs

- If contracts are too strict, the pipeline may feel bureaucratic instead of helpful.
- If contracts are too loose, agents may continue to blur stage responsibilities and invent missing upstream decisions.
- Reducing context too aggressively could hurt output quality; the context access policy must prioritize correctness over token savings.
- Updating every related template at once increases consistency but also increases the chance of small wording drift between stages.
- Removing confirmation summaries saves tokens, but users must review generated files directly after creation.

## Open Questions

- None.
