---
name: nextjs
description: Use this skill when working on Next.js App Router files or framework-specific Next.js behavior.
---

# nextjs

Use this skill when working on Next.js App Router files or framework-specific Next.js behavior.

This skill covers Next.js conventions, boundaries, and rendering decisions. It does not cover React component design or UX strategy.

## Use this skill for

- `src/app/**` pages, layouts, route handlers, loading, error, and not-found files
- Server Component vs Client Component decisions
- Next.js data fetching and rendering placement
- route handler conventions
- metadata APIs
- App Router file conventions
- framework boundary decisions in Next.js files

## Core principles

### 1. Use App Router conventions directly
- Put route UI in `page.tsx`.
- Put shared route shell UI in `layout.tsx`.
- Put custom request handlers in `route.ts`.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` for route segment states when they improve the user experience.
- Keep special files focused on their framework role.

### 2. Default to Server Components
- Pages and layouts are Server Components by default.
- Keep them as Server Components unless interactivity or browser-only APIs require a Client Component.
- Fetch initial and SEO-critical data on the server when possible.
- Pass only serializable props from Server Components to Client Components.

### 3. Use Client Components only when needed
Add `"use client"` only for code that needs client-side capabilities, such as:
- state and event handlers
- effects or lifecycle behavior
- browser-only APIs like `window`, `localStorage`, or geolocation
- client-only third-party components

Prefer isolating the smallest interactive subtree into a Client Component rather than turning a whole page or layout into a Client Component.

### 4. Keep `src/app/**` thin
- Treat `src/app/**` as a framework adapter boundary.
- When an architecture skill or technical design defines an orchestration/application boundary, App Router files may call only that boundary.
- Pages, layouts, route handlers, Server Actions, and metadata functions must not bypass the selected architecture's dependency rules.
- Keep request parsing, response formatting, redirects, rendering decisions, and framework concerns in `src/app/**`.
- Move reusable business behavior out of App Router files.

### 5. Route handlers are framework adapters
- Define route handlers in `route.ts` files inside `app`.
- Use the Web `Request` and `Response` APIs.
- Keep handlers focused on HTTP concerns: parse input, call application behavior, and return a stable response.
- Do not put backend business rules directly in route handlers.
- Do not import infrastructure, database clients, repository implementations, SDK wrappers, persistence models, or external API shapes directly from App Router files unless the selected architecture explicitly allows it.

### 6. Use Next.js error and empty-state conventions
- Use `notFound()` for route resources that genuinely do not exist.
- Add `not-found.tsx` when a route segment needs a custom 404 UI.
- Add `loading.tsx` when a route segment benefits from an instant loading state.
- Add `error.tsx` for unexpected runtime errors in a route segment.
- Remember that `error.tsx` must be a Client Component.

### 7. Separate expected errors from unexpected errors
- Treat expected errors, such as validation failures, not-found cases, and user-correctable failures, as explicit states or return values.
- Let unexpected errors throw so route-level error boundaries can handle them.
- Keep client-safe messages in UI responses and logs/internal details at the server boundary.

### 8. Use metadata APIs instead of manual `<head>` tags
- Use `metadata` or `generateMetadata` for route metadata.
- Do not manually add `<title>` or `<meta>` tags in root layouts.
- Use file-based metadata conventions for icons, Open Graph images, robots, sitemap, and related files when appropriate.

### 9. Keep rendering and data ownership clear
- Server Components can fetch and prepare data for rendering.
- Client Components should own interaction state and browser behavior.
- Avoid duplicating derived state between server-rendered data and client state.
- Do not move data fetching to the client unless it is user-triggered, browser-specific, or intentionally client-side.

### 10. Prefer simple route segment design
- Use route groups and advanced routing features only when they clearly improve organization or behavior.
- Do not introduce parallel routes, intercepting routes, templates, or segment config unless the feature actually needs them.
- Prefer the standard App Router primitives first.

## Decision rule

When unsure, prefer:
1. Server Components by default
2. the smallest necessary Client Component boundary
3. App Router files as thin framework adapters
4. framework conventions over custom routing abstractions
5. `metadata` / `generateMetadata` over manual head management
6. explicit loading, not-found, and error states when the route needs them
