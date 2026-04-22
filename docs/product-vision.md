# Sibu Product Vision

## Summary

Sibu helps individual software engineers and small to medium-sized teams build substantially faster with AI without lowering their standards.

It exists because the current AI development landscape feels like everyone is running their own private race against time. New tools, models, workflows, agents, editors, prompts, and practices appear constantly. Some of them are genuinely useful, but putting them together into a working development environment is hard, fragile, and different for every team.

Sibu turns that chaos into a practical workflow. It is a CLI that helps developers set up and maintain an AI-augmented working environment: shared agent instructions, skills, templates, safety rules, sync checks, and conventions that make AI collaboration faster, clearer, and more responsible.

Sibu is not here to replace the engineer. It is here to amplify the engineer.

## Brand Rationale

Sibu is meant to feel wise, grounded, and local without becoming mystical or grandiose.

The name fits the product because the product is not an AI autopilot. It is a guide. It helps engineers work with better judgment, clearer structure, and stronger respect for their own craft. Sibu should feel like a steady source of orientation: something that helps a team move faster without losing itself.

That matches the product's core promise. Sibu does not win by sounding futuristic or all-powerful. It wins by helping developers bring order to fast-moving AI work, protect quality, and keep human ownership intact.

The name should therefore carry a few qualities:

- wisdom without ceremony
- guidance without control
- momentum without recklessness
- local pride without turning the product into folklore theater

Sibu should feel human, confident, and rooted. It should sound like a tool that helps people make better decisions in motion.

## Product North Star

A developer should be able to run `sibu init` in a repo with no AI workflow, start working immediately, and feel guided into a better way of collaborating with AI.

The ideal outcome is simple: a developer finishes a real user story in a couple of hours and feels proud of both the speed and the quality of the work.

Sibu succeeds when AI stops feeling like a pile of disconnected experiments and starts feeling like a reliable development loop.

## Target User

Sibu is built first for:

- solo software engineers who want a stronger personal AI development workflow
- small teams that want shared conventions without heavyweight process
- medium-sized teams that need consistency but still value local control and adaptability

The first user is the engineer or team that wants to move faster now, but still cares deeply about clean code, maintainability, and human ownership.

## Core Problem

AI-assisted development is moving faster than most teams can absorb.

Developers are experimenting individually. Everyone is trying to catch up at their own pace. Some people have strong local workflows; others have scattered prompts, half-working agent files, copied instructions, editor-specific setup, and no shared standards.

The result is uneven quality:

- AI helps sometimes, but the workflow is inconsistent.
- Setup is repetitive and changes constantly.
- Good practices live in one person's machine or memory.
- Teams lack a simple way to keep their AI workflow current.
- Developers are tempted into huge, vague AI tasks that produce low-trust output.

Sibu addresses this by packaging proven AI-augmented development practices into a small, understandable framework that can evolve over time.

## Product Positioning

Sibu is a CLI that stays beside the developer while they set up and maintain an AI-augmented working environment.

It is part workflow kit, part template manager, part agent onboarding system, but the primary experience should feel like a CLI companion: direct, useful, and grounded in the repo.

Sibu should help answer:

- What agent instructions should this project have?
- Which skills should be available?
- Which files are managed by the workflow?
- What has drifted from the current templates?
- How can a team safely adopt updates without losing local control?
- How should we work with AI in small, high-quality chunks?

Sibu should feel like a lightweight framework that puts the useful pieces together in a way that works.

## Product Philosophy

Sibu is opinionated about engineering quality, especially clean code.

It should push developers toward:

- small chunks of work
- explicit plans before code changes
- human review and confirmation
- clean, readable implementations
- focused skills for focused tasks
- workflow maintenance instead of stale setup files
- responsible use of AI as an amplifier, not an autopilot

Sibu should be flexible everywhere else.

Users should be able to select the languages, frameworks, agents, and architecture guidance that fit their project. If they decide a managed skill or workflow file no longer fits, they should be able to unmanage it and take full ownership from that point forward.

The framework should provide strong defaults, not a cage.

## Small Work Is the Center

One of Sibu's most important beliefs is that AI works best when developers use it on small, well-shaped chunks of work.

Sibu should not encourage users to hand a huge vague goal to an agent and disappear. That is how teams get impressive demos, fragile code, and low trust.

Instead, Sibu should make the better behavior feel natural:

1. define a focused task
2. inspect the repo context
3. propose a plan
4. confirm scope
5. make the change
6. validate it
7. sync or update workflow files when needed

The product should repeatedly guide users back to this loop. Move fast, but keep the work reviewable. Use AI aggressively, but keep the engineer in control.

## User Control

The user must always be in control.

Sibu can install required skills and managed workflow files, but it must never pretend those files belong more to Sibu than to the user. A project should be able to adopt, customize, review, or stop managing pieces of the workflow as needed.

Sibu should be transparent about:

- what it creates
- what it manages
- what changed
- what is missing
- what is out of date
- what it will not overwrite automatically

When local edits exist, Sibu should protect them. When updates are available, Sibu should explain them. When a user wants to drift, Sibu should allow it.

## Trust and Quality

Sibu must never remove user agency in the name of convenience.

It should avoid destructive actions unless the user explicitly asks for them or confirms the plan. It should not silently overwrite customized workflow files. It should not hide template updates behind vague messages. It should not imply that AI-generated work is trustworthy just because it completed.

Trust comes from making the loop visible:

- show the plan
- explain the change
- preserve local edits
- validate when possible
- make drift understandable
- keep the human responsible for direction and judgment

The quality bar is not “AI produced something.” The quality bar is “the engineer is proud to ship it.”

## Product Voice

Sibu should feel smart and fun.

It can have personality. It can feel a little playful, energetic, and clever: quick, inventive, technical, and confident without becoming unserious.

The voice should be:

- concise
- practical
- encouraging
- a little playful
- honest about tradeoffs
- allergic to corporate fluff

Sibu should make developers feel momentum, not bureaucracy.

## What Sibu Should Not Become

Sibu should not become an AI IDE.

It should not try to become Windsurf, Cursor, Copilot, or any other full development environment. Sibu's job is not to own the editor, the model, the agent, or the entire development surface.

Sibu should also reject the fantasy that high-quality software comes from telling AI, “go build this big thing while I get coffee.”

That promise is seductive and wrong. Sibu should push against it.

Sibu should empower users to use AI to amplify their own judgment, speed, and craft. It should not sell replacement as the product.

## Success Signal

Sibu is working when a new user can enter a repo with no AI environment, run `sibu init`, and quickly understand how to work with the framework.

They start a real task. Sibu guides them into small, responsible collaboration with AI. They move faster than they expected. They finish a user story in a couple of hours. The code is clean. The workflow makes sense. They feel proud.

That feeling is the signal: velocity without shame, speed without slop, AI without surrendering ownership.
