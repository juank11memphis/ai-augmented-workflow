epics and user stories
-> AI implementation plan
-> AI implementation executor

Initial desired rules:

- Product Context Map must require Product Vision.
- Feature Brief must require Product Vision and Product Context Map.
- Technical Design must require Product Vision, Product Context Map, and Feature Brief.
- UX Design should require Product Vision and Feature Brief, and should use Product Context guidance when available to preserve responsibility boundaries and language, but not to make architecture decisions.
- Epics and User Stories must require Feature Brief and Technical Design, plus UX spec when UI is involved. They may read Product Vision when product fit, scope, or user intent is ambiguous.
- AI Implementation Planner must require User Story, Epic Brief, Feature Brief, Technical Design, and UX when UI is involved.
- AI Implementation Executor must treat the approved implementation plan, story, feature brief, technical design, and Product Context guidance as an execution contract.
- Technical Design must identify selected Product Contexts and provide enough module/file/folder placement guidance for implementation agents to know where work belongs. It should not require a full folder tree for every small change unless placement is ambiguous, new, cross-context, or
  architecturally important.

Important framing:

- This should not create heavyweight bureaucracy.
- Each artifact should require only the upstream context needed for its responsibility.
- Each artifact may add decisions only within its own layer of responsibility.
- If required upstream context is missing, ambiguous, or contradicted, the skill should stop and ask for correction instead of inventing.
- Keep the guidance concise and avoid duplicating the full Product Context Map concept in every skill.

Please interview me one focused question at a time until you have enough practical understanding and explicit alignment, then write the feature brief to the appropriate `docs/features/<feature-slug>/feature_brief.md` path