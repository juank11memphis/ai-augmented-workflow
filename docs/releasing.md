# Releasing Sibu

This document is maintainer-facing release guidance for publishing Sibu to npm.

Use this guide when preparing, validating, publishing, and announcing a new Sibu version. Keep `README.md` focused on end-user install and update guidance.

## Release workflow overview

A normal Sibu release will cover these stages:

1. confirm npm package ownership, access, and auth are ready
2. update the package version and release notes
3. validate the packaged artifact locally
4. publish the new version to npm
5. publish the matching GitHub Release
6. verify the published version behaves as expected

The detailed checklist for each stage belongs in this document.

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
npm view sibu version
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

If the package name, access model, or npm org setup is still unsettled, resolve that before publishing.

## 2. Update version and release notes

Prepare the release metadata before validating or publishing:

1. update the package version in `package.json`
2. add the new release entry to `CHANGELOG.md`
3. treat `CHANGELOG.md` as the canonical source for release notes
4. plan to publish the matching GitHub Release from that same changelog summary

Write or update the changelog entry first. The GitHub Release should reuse that same user-facing summary instead of inventing a second version of the release notes.

## 3. Validate the packaged artifact locally

Validate the exact package users will install, not just the source checkout.

Run the baseline verification first:

```sh
pnpm verify
```

Then validate the packed artifact and installed runtime:

```sh
npm pack
pnpm run validate:packed-runtime
pnpm run validate:doctor-version-advisory
pnpm run validate:post-update-doctor-drift
```

These checks cover:

- general repo verification
- packed tarball contents
- installed CLI runtime behavior from the tarball
- the non-blocking npm update advisory flow in `sibu doctor`
- the explicit post-update flow where rerunning `sibu doctor` can surface drift without mutating project files

Do not rely on `pnpm link` or source-checkout execution as the release-readiness signal.

## 4. Publish to npm

Once validation passes, publish with npm using the package metadata already prepared for distribution.

A normal publication should follow npm's standard workflow:

```sh
npm publish
```

If the final package uses a scope that requires explicit public access, publish with the appropriate npm access configuration for that package.

## 5. Publish the matching GitHub Release

After npm publish succeeds:

1. create the matching GitHub Release for the same version
2. use the `CHANGELOG.md` entry as the source for the GitHub Release notes
3. keep the changelog and GitHub Release aligned

`CHANGELOG.md` is the canonical source in the repo. The GitHub Release is the public release surface users can browse from GitHub.

## 6. Verify the published release

After publishing, verify the release externally:

1. confirm the new package version is available from npm
2. confirm a fresh install or update path uses the published version
3. confirm `sibu doctor` sees the new latest version as expected
4. confirm the matching GitHub Release is published with the same release summary as the changelog entry

If verification fails, treat that as a release issue to resolve before announcing the version more broadly.
