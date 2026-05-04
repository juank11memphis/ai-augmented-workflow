# Step: Update Command Pattern Product Context rule

## Goal

Make the Command Pattern architecture skill place command-oriented vertical slices within or clearly under approved Product Context ownership when contexts are present.

## Scope

- Update `templates/skills/architecture/command-pattern/SKILL.md` with a compact Product Context compatibility rule.
- State that Product Contexts answer “where does this work belong?” and Command Pattern guidance answers how command-oriented slices are structured internally.
- Clarify that vertical slices should live within or clearly belong to the relevant Product Context when `docs/product-context-map.md`, a feature brief, or a technical design names Product Contexts.
- Clarify that feature-local command, handler, port, adapter, and result guidance still applies inside the selected context boundary.
- Route new-context decisions back to `product-context-map-writer` instead of inventing Product Contexts.
- Do not update DDD + Hexagonal or any other architecture skill in this step.

## Files

- `templates/skills/architecture/command-pattern/SKILL.md`

## Done when

- Command Pattern guidance places vertical slices within or clearly under Product Context ownership when Product Contexts are present.
- The skill preserves existing command-oriented vertical slice guidance while adding context compatibility.
- The skill routes new Product Context decisions back to the Product Context Map workflow.
- Added guidance is concise and avoids duplicating downstream planning instructions.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:13:50Z
