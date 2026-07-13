# Feature Ideas

## Stronger React Component File Boundaries

- Strengthen the React guidance so each meaningful component is created in its own file instead of placing multiple components in the same file.
- Make the rule clearer and harder for LLMs to miss: avoid helper subcomponents hidden at the bottom of a parent component file unless they are truly tiny and not reusable.
- Encourage file-per-component structure that improves readability, reviewability, testing, reuse, and future refactoring.
- Revisit the existing rule because the current guidance exists but is not working reliably enough in practice.
