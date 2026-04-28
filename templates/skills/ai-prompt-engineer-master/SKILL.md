---
name: ai-prompt-engineer-master
description: "Use when creating, rewriting, optimizing, compressing, evaluating, or systematizing prompts for AI models, agents, tools, coding assistants, product workflows, or reusable prompt templates. Focus on top-quality results with the smallest effective token budget: preserve or improve output quality first, then remove every token that does not contribute to that quality."
---

# AI Prompt Engineer Master

## Core principle

Optimize for the **smallest prompt that reliably produces the required quality**.

This skill is model-agnostic: adapt wording to the target model when known, but do not assume any specific provider or model family.

Do not trade quality away for fewer tokens. First define the quality bar, then find the leanest prompt that meets it.

## Workflow

1. **Clarify the prompt job**
   - Identify the target model or agent if known.
   - Identify the user, task, input context, output format, quality bar, and failure modes.
   - Ask only when missing information would materially change the prompt.

2. **Define the quality contract**
   - State the outcome the prompt must achieve.
   - Include success criteria, required constraints, and non-negotiable safety or compliance rules.
   - Define what the model should do when context is missing, ambiguous, or contradictory.

3. **Design outcome-first**
   - Prefer destination over step-by-step process.
   - Use process instructions only when order, auditability, or tool behavior truly matters.
   - Put stable instructions before dynamic task/input content.

4. **Compress without quality loss**
   - Remove duplicated rules, generic advice, filler, motivational language, and obvious model capabilities.
   - Replace long explanations with precise constraints or decision rules.
   - Merge overlapping instructions.
   - Keep examples only when they prevent likely errors or define subtle style/format expectations.

5. **Make the output easy to verify**
   - Specify the output shape only as tightly as needed.
   - Prefer schemas, examples, or bullets when they reduce ambiguity.
   - Include acceptance checks for high-stakes or reusable prompts.

6. **Deliver usable artifacts**
   - Provide the final prompt in a copy-ready block.
   - If helpful, include a short note explaining the token-saving choices.
   - For reusable prompts, separate stable prompt text from runtime variables.

## Prompt quality checklist

A strong prompt usually has:

- **Role or perspective** only when it changes behavior.
- **Task** stated as a concrete outcome.
- **Context** limited to information the model needs.
- **Constraints** that prevent real failures.
- **Output format** specific enough for the consumer.
- **Missing-context behavior** so the model does not invent facts.
- **Tone/style** only when user-facing quality depends on it.
- **Validation criteria** for important workflows.

## Token discipline rules

Prefer:

- “Return JSON matching this schema” over a prose explanation of each field when a schema is available.
- “If evidence is missing, say what is missing” over long hallucination warnings.
- “Use concise bullets” over multiple style paragraphs.
- One representative example over many near-duplicates.
- A short decision rule over absolute words like “always” or “never” unless the rule is truly invariant.

Avoid:

- Repeating the same constraint in multiple sections.
- Explaining why the model should follow ordinary instructions.
- Adding chain-of-thought requests.
- Keeping legacy prompt scaffolding because it “might help.”
- Compressing away domain terms, examples, or constraints that carry real quality value.

## Output pattern

When optimizing a prompt, use this structure unless the user asks otherwise:

```md
## Final prompt

<prompt>

## Why this is token-efficient

- <1-3 bullets about what was preserved or removed>

## Optional stronger version

<only include if quality risks justify extra tokens>
```

If the user only wants the prompt, return only the final prompt.
