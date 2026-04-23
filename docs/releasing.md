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
