---
name: scrum-master-planner-toolbox
description: Focused worker rules for planning one Feature's Epic and Story hierarchy on GitHub.
---

# Scrum Master Planner Toolbox

Use only the main agent's narrow packet for one Feature. Read `.agents/skills/scrum-master-planner/SKILL.md` and follow its planning, issue-content, hierarchy, and stop rules. The main agent owns user-facing questions, route selection, stage feedback, and execution authorization; do not interact with the user or start implementation.

## Inputs and boundaries

Require the exact repository and Feature issue identity/link, published BRD and SDD artifact identities, required UX artifact identity when the Feature changes UI, agreed constraints, selected relevant skills, and a compact output contract. Stop with a specific missing-input blocker rather than inferring scope. Use GitHub MCP to read each published artifact's identity and content directly into transient context; do not use local Feature files, drafts, or an on-disk artifact cache. Reuse unchanged reads in this worker context. Read embedded SDD diagrams and binding UX mockups when applicable.

Plan the smallest coherent Epic and Story slices supported by the sources. Do not revise upstream artifacts or invent product, architecture, flag, or verification decisions. If a material choice, conflicting or incomplete source, consequential scope change, or required flag decision arises, stop before dependent writes and return one focused question with its consequence to the main agent. Resume the same request only with a settled answer and any corrected published source identities.

## GitHub publication

Confirm GitHub MCP can access the packet's repository, Feature issue, issue artifacts, issue read/write, and native sub-issue operations before mutation. Identify repository, target issue, intended content, and parent for each effect. Search under the intended parent for a matching Epic or Story before creating one; reuse confirmed matches, never create duplicates or orphan Stories. Epics are native Feature children; each Story is a native child of exactly one Epic.

After each create, update, or parent operation, read back the exact issue's identity, intended content, parentage, and link. A tool response alone is not confirmation. On timeout or uncertain effect, read back before retrying; reconcile an effect already present, retry only after absence is established, and stop on unavailable or conflicting evidence. Distinguish confirmed partial work from uncertain effects and do not create dependent Stories from an unconfirmed Epic. External mutations remain subject to host permission. Do not expose credentials, full private bodies, raw prompts, or large payloads in logs or handoff.

## Handoff

Return only a concise outcome, readback-confirmed Epic names/links and Story count, and any focused material question or blocker. Name affected uncertain issues separately from confirmed work. Do not return full sources, issue bodies, every Story URL, tool logs, or planning exploration. Never claim completion from partial or uncertain publication; the main agent presents the result and separately asks whether to start implementation.
