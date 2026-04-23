# Technical Design: npm Install

## Inputs
- Product vision: `docs/product-vision.md`
- Feature brief: `docs/features/npm-install/npm-install/feature_brief.md`
- Delegated skills: `clean-code`; use `typescript` only if implementation touches `.ts` files

## Summary
Add a publishable npm distribution for the CLI so a user can install or update Sibu with standard npm global install. The implementation should keep npm as the only supported install/update mechanism, make `sibu doctor` the advisory place where users hear about newer npm versions, and preserve the current explicit workflow where users rerun `sibu doctor` and then choose `sibu sync` if newer templates introduce drift. The same feature should also leave the repo with one documented maintainer release path covering npm registry setup, version publishing, and release communication.

## Existing Context
- `package.json` already defines a single CLI binary (`sibu`) and a `prepack` build hook, but the package is still marked `private: true`, so it cannot be published as-is.
- The compiled entrypoint is emitted to `bin/sibu.js` from `src/sibu.tsx`; npm install should rely on that existing build output instead of adding a second runtime wrapper.
- `README.md` still mixes end-user install guidance with local development guidance (`pnpm dev:link`), so the current docs do not provide one canonical install/update story.
- `AGENTS.md` already instructs agents to run `sibu doctor` once per session. That existing habit is the right trigger for advisory version checks; `AGENTS.md` itself should stay static and should not perform runtime detection.
- `sibu doctor` currently diagnoses local workflow state only. It is the natural place to add a non-blocking npm version advisory because it already reports health and next steps.
- The repo uses `CHANGELOG.md` as the canonical release-notes source and matching GitHub Releases as the public release surface for each published version.

## Proposed Design

### 1. Publishable package metadata
Update package metadata so the CLI can be published without changing the runtime shape.

Concrete changes:
- Remove `private: true` from `package.json`.
- Keep the existing `bin.sibu -> ./bin/sibu.js` mapping as the canonical executable unless the package-name decision explicitly changes the command.
- Add publish-oriented metadata in `package.json` as needed for npm distribution hygiene:
  - `repository`
  - `homepage`
  - `bugs`
  - `engines.node` set to `>=20`
  - `publishConfig.access` only if the final package name is scoped
- Keep `files` narrow so the published tarball contains only runtime-required assets (`bin/`, `templates/`, `README.md`, and any other required runtime files).

Decision:
- Prefer an unscoped public package name if the name is available and aligned with the current brand. If the package must be scoped, the CLI binary should still stay short (`sibu`) unless there is a hard naming conflict.

### 2. Build and pack flow
Do not introduce a special install/update mechanism. Reuse the current npm lifecycle:
- `prepack` builds the CLI before `npm pack` / `npm publish`
- `npm install -g <package>` handles both install and update
- global install consumes the packed artifact and exposes the declared binary

Implementation implications:
- treat `npm pack` as the local validation artifact for release readiness
- verify that required runtime files exist in the tarball, especially templates consumed at runtime
- complement tarball inspection with one scripted installed-runtime smoke check (for example `pnpm run validate:packed-runtime`) that installs the produced tarball into an isolated npm prefix and runs the CLI from there
- avoid depending on repo-only development commands such as `pnpm link` for end-user installation or updates

### 3. Advisory npm version check in `sibu doctor`
Add a lightweight version-check path to `sibu doctor` that compares the installed local CLI version against the latest npm-published version.

Behavior:
- run the normal local doctor checks first or alongside the version check
- if npm cannot be reached, continue the doctor command without failing the workflow health check
- if a newer npm version exists, show an advisory message such as:
  - a newer Sibu version is available
  - update with `npm install -g sibu`
- do not mark the workflow as unhealthy solely because a newer CLI version exists
- do not mutate any local files as part of the version advisory

Responsibility split:
- `AGENTS.md` tells the user/agent to run `sibu doctor`
- `sibu doctor` performs the version advisory check
- npm performs the actual install/update
- `sibu sync` remains the explicit template adoption step

Recommended implementation detail:
- cache the result for a short period so repeated `sibu doctor` runs do not hit the network every time in one session/day
- keep one deterministic override path for validation (for example env vars) so maintainers can simulate update-available and npm-unavailable scenarios without a real publish cycle
- treat npm registry access as an advisory integration, not a required dependency for local health checks

### 4. Post-update workflow
After the user updates with npm, the expected path should stay explicit:
1. user runs `sibu doctor`
2. Sibu advises that a newer npm version exists
3. user runs `npm install -g sibu`
4. user reruns `sibu doctor`
5. doctor reports any template-version drift against the newly installed version
6. user runs `sibu sync` if they want to review/apply those updates

This keeps updates standard and keeps file mutation under the existing explicit sync flow. Updating Sibu alone changes what `sibu doctor` can detect; it does not mutate project files.

### 5. Documentation split: user install/update vs contributor setup
Make npm the only user-facing install and update path while keeping contributor setup separate.

Concrete doc changes:
- `README.md` should open with one canonical user flow built around `npm install -g sibu` and the doctor → update → doctor → sync path
- contributor-only flows (`pnpm install`, `pnpm dev:link`, local build/test) should stay under clearly labeled contributor sections
- remove clone/link language from end-user onboarding
- document the update advisory flow briefly:
  - run `sibu doctor`
  - if prompted, update with npm
  - rerun `sibu doctor`
  - use `sibu sync` if drift is reported

### 6. Maintainer release documentation
Document one standard release path that uses npm conventions and leaves a clear paper trail for users.

Recommended output locations:
- keep `README.md` focused on end-user install/update
- add a maintainer-facing release document such as `docs/releasing.md` or a clearly named equivalent
- record user-visible release notes in both required places:
  - `CHANGELOG.md` as the canonical source in the repo
  - GitHub Releases as the public release surface for each published version
- maintainers should update `CHANGELOG.md` first during release preparation, then publish the matching GitHub Release from that same summary so both locations stay aligned

Minimum maintainer release flow to document:
1. confirm npm package ownership/access and registry auth are configured
2. update the package version
3. update `CHANGELOG.md` for the new version
4. run `pnpm verify`
5. run `npm pack`
6. smoke test the tarball install
7. publish to npm
8. create or update the matching GitHub Release using the changelog entry as the source
9. verify that `sibu doctor` sees the new latest version as expected

The design should require the repo to explain these steps, not rely on maintainer memory.

### 7. npm registry integration boundary
The feature should use standard npm registry behavior rather than a custom release service.

Concrete expectations:
- package publication uses npm registry ownership and npm authentication/token setup
- version lookup in `sibu doctor` uses npm’s standard package metadata path for the chosen package name/dist-tag
- `CHANGELOG.md` is the canonical release-notes source maintained in the repo
- GitHub Releases are created for each published version as the public release surface
- release notes are produced by repo maintainers as part of the release workflow, not synthesized dynamically by the CLI

### 8. Cross-platform boundary
The implementation should rely on npm’s standard global install behavior rather than custom shell scripts or platform-specific wrappers. Cross-platform support therefore depends on:
- Node 20+ and npm meeting the supported minimum version
- the compiled `bin/sibu.js` remaining executable with the existing shebang
- runtime file lookup working from an installed package location instead of the repo root
- npm version lookup using a standard registry request path that works consistently across macOS, Linux, and Windows

Any path assumptions that only work inside the development checkout should be treated as bugs to fix during implementation.

## Validation
- `pnpm verify`
- validate on Node 20+
- `npm pack`
- global install from the produced tarball
- `pnpm run validate:packed-runtime`
- smoke test `sibu --help` from the tarball-installed binary
- smoke test `sibu doctor` from a temporary fixture project outside the source checkout
- verify that an older installed version receives a non-blocking npm update advisory
- `pnpm run validate:doctor-version-advisory`
- verify that after upgrading, rerunning `sibu doctor` reports any resulting template drift without changing files
- `pnpm run validate:post-update-doctor-drift`
- manual check that README install/update instructions match the shipped package name and command
- manual check that maintainer release docs cover npm auth/access, version bumping, changelog/release notes, pack/publish, and post-publish verification

## Risks / Open Questions
- The npm package name may already be taken; the design should not assume `sibu` is available until verified.
- Minimum supported Node version is Node 20+; `engines.node` should be set to `>=20` before publishing.
- If runtime template lookup depends on repo-relative paths, npm-installed execution may fail even if local development works.
- npm version checks should be cached enough to avoid noisy repeated requests but still feel current.
- Every release must update both `CHANGELOG.md` and the matching GitHub Release, and the two must stay aligned.
