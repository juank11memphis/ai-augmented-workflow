# Step: Document maintainer release usage

## Goal

Update maintainer release documentation so Sibu maintainers know when and how to use the local changelog script safely during release preparation.

## Scope

- Update `docs/releasing.md` in the release-notes/version preparation section.
- Document example usage for `pnpm admin:changelog -- --version <version>` and optional flags such as `--from`, `--to`, `--date`, and `--yes`.
- Explain that the script previews proposed changelog changes before writing and preserves existing content outside the target section.
- Explain that maintainers remain responsible for reviewing generated entries, SemVer guidance, and warnings.
- Mention the script does not bump package versions, create tags, publish npm packages, or create GitHub Releases.
- Include validation guidance after running the script.
- Do not change end-user README installation guidance or document this as a public `sibu` command.

## Files

- `docs/releasing.md`

## Done when

- Release documentation explains when to run the maintainer script.
- Release documentation includes concrete command examples.
- Release documentation preserves the changelog-first release trust model.
- Release documentation clearly states out-of-scope release actions remain manual.
- `pnpm build`, `pnpm check`, and relevant docs-inspection validation pass if code was not changed in this step.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T20:02:12-06:00
