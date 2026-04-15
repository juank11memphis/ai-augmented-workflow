---
name: typescript
description: Use this skill when writing or modifying .ts or .tsx files and you need practical TypeScript guidance.
---

# typescript

Use this skill when writing or modifying `.ts` or `.tsx` files and you need practical TypeScript guidance.

Apply this skill together with the `clean-code` skill. Favor readable, maintainable type design over clever type tricks.

## Use this skill for

- designing types for new code
- improving type safety in existing code
- modeling domain, API, and UI state
- reviewing TypeScript quality
- reducing unsafe casts and weak typing

## Core principles

### 1. Prefer precise types over broad types
- Choose the narrowest type that matches the real contract.
- Prefer specific object shapes, literal unions, and well-named interfaces over broad catch-all types.
- Do not use `any` when a better type is available.

### 2. Prefer `unknown` at boundaries, then narrow
- Use `unknown` for untrusted external input.
- Narrow with checks before using values.
- Do not spread unsafe assumptions through the codebase.

#### Prefer
```ts
function parsePayload(input: unknown): PlaylistRequest {
  if (!isPlaylistRequest(input)) {
    throw new Error("Invalid playlist request");
  }

  return input;
}
```

#### Avoid
```ts
function parsePayload(input: any): PlaylistRequest {
  return input as PlaylistRequest;
}
```

### 3. Prefer narrowing over casting
- Use control flow, guards, discriminated unions, and predicates to refine types.
- Use casts only when you truly know more than TypeScript can infer.
- Keep casts local and rare.

### 4. Model states explicitly
- When values can be in distinct states, prefer explicit modeling.
- Use discriminated unions when they make invalid states harder to represent.
- Avoid boolean-flag combinations when a named state model is clearer.

#### Prefer
```ts
type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; tracks: Track[] }
  | { status: "error"; message: string };
```

#### Avoid
```ts
type LoadState = {
  isLoading: boolean;
  hasError: boolean;
  tracks?: Track[];
  message?: string;
};
```

### 5. Keep public types readable
- Function signatures, exported types, and shared contracts should be easy to understand.
- Prefer named types when they make intent clearer.
- Avoid deeply nested inline types for important boundaries.

### 6. Use optionality carefully
- Only mark fields optional when absence is a real part of the contract.
- Prefer explicit unions such as `string | null` when they better communicate intent.
- Avoid stacking `undefined | null | optional` unless the distinction is meaningful.

### 7. Keep generics useful, not impressive
- Use generics when they improve correctness or reuse.
- Do not introduce complex generic abstractions unless they clearly pay off.
- Prefer simple, understandable generic constraints.

### 8. Let inference help, but not hide intent
- Use inference for obvious local values.
- Add explicit annotations at important boundaries such as exports, shared contracts, and complex return types.
- If inferred types become confusing, make them explicit.

### 9. Encode invariants where helpful
- Use TypeScript to make invalid states harder to represent.
- Do not try to force every runtime guarantee into the type system.
- Balance safety with readability and development speed.

## Decision rule

When unsure, prefer:
1. narrower types
2. narrowing over casting
3. explicit state models
4. readable public contracts
5. simpler type designs over advanced tricks
