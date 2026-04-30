# Releasing Sibu

This document is maintainer-facing release guidance for publishing Sibu to npm.

Use this guide when preparing, validating, publishing, and announcing a new Sibu version. Keep `README.md` focused on end-user install and update guidance.

## Release workflow overview

A normal Sibu release covers these stages:

1. confirm release prerequisites
2. prepare release notes and package metadata
3. validate the packaged artifact locally
4. publish the new version to npm
5. publish the matching GitHub Release
6. verify the published version behaves as expected

`CHANGELOG.md` is the canonical source for release notes. The maintainer changelog helper can draft or update that file, but maintainers still own the final release decision and wording.

## First-time npm registry setup

Use this section the first time you prepare Sibu for npm publication, or any time the package name or npm ownership model changes.

Before the first release, confirm all of the following:

1. the final package name is decided
2. the package name is available or already owned by the correct npm account/org
3. the GitHub repository is public if you intend to publish Sibu as a normal public npm package
4. you can authenticate with npm locally
5. the account you are using has publish rights for the chosen package name

Helpful checks:

```sh
npm whoami
npm view @juancr11/sibu version
```

Use `npm whoami` to confirm the active npm account. Use `npm view <package-name> version` to see whether a package already exists on the registry.

If the final package uses a scope, make sure the scope owner and publish access are already configured before attempting the first release. If the intended unscoped package name is unavailable, resolve the naming decision before continuing with the release workflow.

After the first successful `npm publish`, verify that the package page exists on npm and that the published metadata matches the version you intended to release.

## 1. Confirm release prerequisites

Before starting a release, confirm all of the following:

- you have npm publish access for the final Sibu package name
- your npm authentication is working locally
- the repo is in the state you intend to release
- Node 20 or newer is installed locally
- the package version and binary name you plan to publish are correct
- the previous release tag or intended git range is clear enough to generate release notes

If the package name, access model, npm org setup, or release scope is still unsettled, resolve that before publishing.

## 2. Prepare release notes and package metadata

The preferred maintainer workflow is the guided release script:

```sh
pnpm build
pnpm admin:release -- --dry-run
```

Run the dry run first when you are ready to release from a clean working tree. The workflow inspects commits since the previous SemVer-like tag, proposes the target version, plans the `CHANGELOG.md` and `package.json` updates, and prints the full release sequence before changing files or performing public side effects.

When the preview looks right, run the same command without `--dry-run` and confirm the prompt:

```sh
pnpm admin:release
```

After confirmation, the workflow writes the planned changelog and package metadata, runs `pnpm run validate:release-publish`, creates the release commit, creates the git tag, publishes to npm, pushes the release commit and tag, and creates the matching GitHub Release from the finalized changelog section.

Useful options:

```sh
pnpm admin:release -- --from v0.1.0 --to HEAD --version 0.2.0 --date 2026-04-26
pnpm admin:release -- --version 0.2.0 --yes
pnpm admin:release -- --version 0.2.0 --otp 123456
```

- `--from` and `--to` choose the git range. When `--from` is omitted, the latest reachable SemVer-like tag is used.
- `--version` overrides the commit-derived version. Versions may be entered with a leading `v`, but release metadata is normalized to SemVer without `v`.
- `--date` sets the release date for the versioned changelog section.
- `--otp` passes an npm one-time password to `npm publish` for accounts with two-factor auth on writes. The workflow masks the code in preview/log output.
- `--dry-run` prints the plan and performs no writes, commits, tags, publishes, pushes, or GitHub Release creation.
- `--yes` skips only the confirmation prompt after printing the preview. It does not skip warnings, metadata safety checks, or release validation.

This is repository-local maintainer tooling. It is not a public `sibu release` command and is not exposed through package `bin` metadata.

If a public side effect fails after an earlier public step succeeds, do not expect automatic rollback. Read the reported completed steps and recovery guidance, then continue manually from the failed step. For example, if GitHub Release creation fails after npm publish and git push succeed, create the GitHub Release manually from the finalized `CHANGELOG.md` section.

`CHANGELOG.md` remains the canonical source for release notes. The GitHub Release should reuse that same user-facing summary instead of inventing a second version of the release notes.

### Lower-level changelog helper

Sibu maintainers can use the local maintainer script from the source repo:

```sh
pnpm build
pnpm admin:changelog -- --version 0.2.0
```

The helper inspects local git history, prints a preview, shows SemVer guidance and warnings, then asks before writing `CHANGELOG.md`. Review the generated entries before accepting them; the script is a release-note assistant, not the release decision-maker.

Useful options:

```sh
pnpm admin:changelog -- --from v0.1.0 --to HEAD --version 0.2.0 --date 2026-04-26
pnpm admin:changelog -- --version 0.2.0 --yes
```

- `--from` and `--to` choose the git range. When `--from` is omitted, the latest reachable tag is used when available.
- `--version` creates or updates a versioned changelog section. Versions may be entered with a leading `v`, but headings are normalized to SemVer without `v`.
- `--date` sets the release date for a versioned section and must use `YYYY-MM-DD`.
- `--yes` skips the confirmation prompt after printing the preview; it does not skip validation or warnings.

The helper preserves existing changelog content outside the target section and blocks when it cannot parse the changelog safely. It does not update `package.json`, create git tags, publish to npm, create GitHub Releases, or expose a public `sibu changelog` command.

After accepting a generated changelog update, inspect the diff:

```sh
git diff -- CHANGELOG.md
```

Edit the changelog manually if the generated text is too raw, too technical, or misses maintainer context. Keep the final entry human-readable and useful for Sibu users.

### Manual package metadata fallback

The guided release workflow updates the root `package.json` version after confirmation. If you are preparing a release manually instead of using `pnpm admin:release`, update the package version in `package.json` to match the release version after the changelog entry is ready.

## 3. Validate the packaged artifact locally

Validate the exact package users will install, not just the source checkout.

Run the full release-readiness validation flow:

```sh
pnpm run validate:release
```

This wrapper runs the publish-readiness validation plus the broader doctor advisory and post-update drift checks.

The underlying checks are:

```sh
pnpm run validate:release-publish
pnpm run validate:doctor-version-advisory
pnpm run validate:post-update-doctor-drift
```

These checks cover:

- general repo verification
- packed tarball contents
- installed CLI runtime behavior from the tarball
- the non-blocking npm update advisory flow in `sibu doctor`
- the explicit post-update flow where rerunning `sibu doctor` can surface drift without mutating project files

`pnpm admin:release` intentionally runs only `pnpm run validate:release-publish` before publishing. That keeps publication blocked on build, test, pack, and installed-runtime readiness, without requiring the maintainer's local Sibu-managed workflow files to be in sync.

Do not rely on `pnpm link` or source-checkout execution as the release-readiness signal.

## 4. Publish to npm

Once validation passes, publish with npm using the package metadata already prepared for distribution.

A normal publication should follow npm's standard workflow:

```sh
npm publish
```

This repo uses the scoped public package name `@juancr11/sibu`, so `package.json` should keep `publishConfig.access` set to `public`.

## 5. Publish the matching GitHub Release

After npm publish succeeds:

1. create the matching GitHub Release for the same version
2. use the finalized `CHANGELOG.md` entry as the source for the GitHub Release notes
3. keep the changelog and GitHub Release aligned

`CHANGELOG.md` is the canonical source in the repo. The GitHub Release is the public release surface users can browse from GitHub.

## 6. Verify the published release

After publishing, verify the release externally:

1. confirm the new package version is available from npm
2. confirm a fresh install or update path uses the published version
3. confirm `sibu doctor` sees the new latest version as expected
4. confirm the matching GitHub Release is published with the same release summary as the changelog entry

If verification fails, treat that as a release issue to resolve before announcing the version more broadly.
