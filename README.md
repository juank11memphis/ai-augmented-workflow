# Sibu

Sibu helps developers set up and maintain an AI-augmented development workflow without handing the steering wheel to the machine.

It gives your repo a practical workflow kit: shared agent instructions, focused skills, safety rules, MCP configuration, template health checks, and sync guidance that help you move faster while keeping local control.

If your AI setup is a pile of copied prompts, half-updated agent files, and “I think this is how we do it now” conventions, Sibu is the reset button.

## Why Sibu exists

AI-assisted development is moving fast. The hard part is no longer finding one more model, editor, agent, or prompt. The hard part is turning all of that motion into a workflow your future self and your team can trust.

Sibu is a CLI companion for that job. It helps you:

- bootstrap consistent AI workflow files in a project
- select the agents, skills, and MCP servers your repo should support
- check whether managed workflow files are missing, modified, or stale
- review template updates without silently overwriting local edits
- keep AI work small, explicit, reviewable, and human-owned

Sibu is not an AI IDE. It is not an autopilot. It is a grounded workflow layer for engineers who want speed without slop.

## Quickstart

Install Sibu globally with npm:

```sh
npm install -g @juancr11/sibu
```

Then run the normal first-use flow from the project you want to equip with an AI workflow:

```sh
sibu init
sibu doctor
sibu sync
```

What happens:

1. `sibu init` creates or records the starting workflow files for your selected agents, skills, and MCP servers.
2. `sibu doctor` runs a read-only health check for missing files, local modifications, template drift, and package update advice.
3. `sibu sync` lets you review drift and template updates interactively before anything changes.

Updating the Sibu npm package does **not** automatically change project files. It only updates the CLI and bundled templates that `sibu doctor` can compare against. Your repo changes only when you explicitly initialize, sync, add/remove supported workflow pieces, or choose a mutating action.

## Core commands

### `sibu init`

Run this once in a project to adopt Sibu:

```sh
sibu init
```

`init` opens an interactive setup flow, lets you choose supported agents and optional workflow pieces, creates missing support files, preserves existing files, and records managed workflow metadata in `.sibu/state.json`.

If `AGENTS.md` is missing, Sibu asks for a project overview and writes one from the bundled template. If files already exist, Sibu keeps them intact instead of pretending it owns your repo.

### `sibu doctor`

Run a read-only health check:

```sh
sibu doctor
```

`doctor` reports workflow state without changing files. It can identify missing managed files, local modifications, malformed state metadata, template version drift, unsupported selections, and npm update advice.

If `doctor` says a newer Sibu version exists, update the CLI and check again:

```sh
npm install -g @juancr11/sibu
sibu doctor
```

A package update may let `doctor` detect newer templates, but it still will not mutate your project. If drift appears, decide whether to review it with `sibu sync`.

### `sibu sync`

Review and apply workflow maintenance actions:

```sh
sibu sync
```

`sync` explains what changed, protects local edits from automatic overwrites, and lets you choose safe actions such as applying an update, recreating a missing managed file, writing a side template for comparison, marking a customized file as reviewed, stopping management, or skipping for later.

Sibu records managed files as `managed`, `customized`, or `unmanaged` in `.sibu/state.json`, so the project remains transparent about what Sibu tracks and what you own directly.

### `sibu skills`

List available workflow skills and see what is selected:

```sh
sibu skills list
```

Stop managing a selected skill file when it no longer fits the project:

```sh
sibu skills stop <file>
```

Sibu updates state, removes the selected skill when applicable, and asks whether to keep or delete the local file.

### `sibu mcp`

List, add, or stop supported MCP server configuration:

```sh
sibu mcp list
sibu mcp use github
sibu mcp stop github
```

Sibu writes supported agent config files, but runtime prerequisites, credentials, provider login, and permissions remain yours.

## MCP server setup

Sibu can generate MCP server configuration for supported agents. Supported MCP servers include GitHub and Notion.

Sibu only writes and tracks MCP config files. Runtime prerequisites, credentials, and provider authentication remain user-owned.

### 1. Confirm available MCP servers

From a Sibu-managed project, run:

```sh
sibu mcp list
```

This shows each available MCP server and whether it is already selected for the project.

### 2. Configure the GitHub MCP server

You can select GitHub during `sibu init`, or add it later:

```sh
sibu mcp use github
```

Sibu writes the relevant config for the agents selected in the project:

- Codex: `.codex/config.toml`
- Claude: `.mcp.json`
- Gemini: `.gemini/settings.json`

All supported agents use GitHub's hosted MCP endpoint instead of requiring Docker. Codex uses Codex's native bearer-token environment variable setting:

```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PERSONAL_ACCESS_TOKEN"
```

Claude uses HTTP MCP config with an authorization header:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

Gemini uses streamable HTTP config with an authorization header:

```json
{
  "mcpServers": {
    "github": {
      "httpUrl": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

### 3. Provide GitHub credentials

Create a GitHub personal access token with the repository permissions your agent should have, then expose it as an environment variable before launching the agent:

```sh
export GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
```

Do not commit tokens or write them into Sibu-managed config files. The generated configs read `GITHUB_PERSONAL_ACCESS_TOKEN` from the environment so credentials can stay outside the repository.

### 4. Configure the Notion MCP server

You can select Notion during `sibu init`, or add it later:

```sh
sibu mcp use notion
```

When Notion is selected, Sibu asks for a Notion docs destination parent page URL or page ID. Sibu stores that parent page reference in `.sibu/state.json` so feature-doc export guidance knows where Notion pages should go.

Sibu configures supported agent MCP files for Notion, but it does not manage Notion OAuth login, workspace selection, integration installation, page permissions, credentials, or live connectivity. Your Notion MCP connection must be authenticated separately and must have access to the configured parent page. For provider setup details, use Notion's MCP documentation: <https://developers.notion.com/guides/mcp/get-started-with-mcp>.

Feature briefs, technical designs, and UX docs are still written to local Markdown first. Notion is an optional export destination, not Sibu's source of truth.

For Codex with the hosted Notion MCP server, you may need to run the agent-specific MCP login flow after Sibu writes config, such as:

```sh
codex mcp login notion
```

### 5. Stop managing an MCP server

To remove a selected MCP server from Sibu's state, run:

```sh
sibu mcp stop github
sibu mcp stop notion
```

Sibu updates generated agent config where possible and asks whether to keep or delete MCP-only config files. Stopping Notion only updates local Sibu state and managed MCP config files; it does not delete Notion pages or change Notion permissions.

## Release notes and changelog

For every Sibu release, update both release-note locations:

- `CHANGELOG.md` is the canonical source in the repo
- the matching GitHub Release is the public release surface

When preparing a release, write or update the `CHANGELOG.md` entry first, then publish the matching GitHub Release using that same summary.

This keeps one source of truth in the repo while still giving users a public release page they can browse from GitHub.

## Maintainer release workflow

If you are preparing a new Sibu npm release, use [`docs/releasing.md`](docs/releasing.md). That guide covers version bumping, `CHANGELOG.md`, tarball-based validation, npm publish, GitHub Release creation, and post-publish verification.

## Contributor development

The rest of this README section is for contributors working on Sibu itself, not for end users installing the CLI.

The CLI entrypoint lives in `src/entrypoints/cli/`, command handlers live in `src/features/`, shared workflow utilities live in `src/shared/`, and everything compiles to `bin/sibu.js`. The `bin/` directory is generated by `pnpm build` and should not be edited directly.

```sh
pnpm install
pnpm verify
```

## Contributor local testing

Use `pnpm link --global` to make the local `sibu` command available from any directory while developing.

This linked workflow is useful for day-to-day contributor development, but it is **not** a supported end-user install path and it is **not** the release-readiness check for npm publishing. For release readiness, prefer tarball-based validation with `npm pack` so you verify the exact package contents users will install.

From this repository:

```sh
pnpm dev:link
```

Then test it in a new project directory:

```sh
mkdir /tmp/test-sibu-project
cd /tmp/test-sibu-project
git init
sibu init
sibu doctor
sibu sync
sibu skills list
find . -maxdepth 2 -type f | sort
```

After editing CLI source files under `src/`, rebuild before testing again:

```sh
cd /home/juanca/code/ai-augmented-workflow
pnpm build
```

When you are done testing the linked CLI, remove the global link:

```sh
pnpm dev:unlink
```

## Validate the npm package

Before treating a build as ready to publish, validate the packaged artifact instead of relying only on `pnpm link`.

### 1. Inspect the tarball contents

```sh
pnpm verify
mkdir -p /tmp/sibu-pack
npm pack --json --pack-destination /tmp/sibu-pack
tar -tzf /tmp/sibu-pack/juancr11-sibu-*.tgz | sort
```

Use the tarball listing to confirm the packed artifact includes the expected runtime files:

- `bin/sibu.js`
- runtime code under `bin/entrypoints/`, `bin/features/`, and `bin/shared/`
- `templates/`
- `README.md`

This check proves the package contents are correct, but it does **not** prove the installed CLI runs correctly after npm global install.

### 2. Smoke test the installed tarball runtime

```sh
pnpm run validate:packed-runtime
```

This command:

- runs `npm pack` in an isolated temporary workspace
- installs the produced tarball into an isolated npm prefix
- verifies `sibu --help` runs from the installed binary
- creates a temporary fixture project outside this repo
- runs `sibu doctor` in that fixture project to prove the installed CLI can read bundled runtime assets such as templates

If this command fails, treat it as an installed-package runtime problem rather than a normal local-development issue.

Treat tarball inspection plus `pnpm run validate:packed-runtime` as the release-readiness path for npm packaging changes. Use `pnpm dev:link` only for interactive local development.

## Validate the doctor npm update advisory

Use the deterministic override hooks to verify both advisory scenarios without depending on a real npm publish cycle:

```sh
pnpm run validate:doctor-version-advisory
```

This validation proves both of these cases locally:

- a newer npm version is available and `sibu doctor` suggests `npm install -g @juancr11/sibu`
- npm lookup is unavailable and `sibu doctor` still completes the local health check without failing

For one-off manual checks, you can also run:

```sh
SIBU_NPM_LATEST_VERSION=9.9.9 node ./bin/sibu.js doctor
SIBU_NPM_LOOKUP_MODE=offline node ./bin/sibu.js doctor
```

## Validate post-update drift after upgrading Sibu

Use the local two-tarball validation flow to prove that upgrading Sibu can surface new drift without changing project files automatically:

```sh
pnpm run validate:post-update-doctor-drift
```

This validation proves the full explicit flow locally:

- install an older local tarball
- run `sibu doctor` and see the npm update advisory
- update to a newer local tarball
- rerun `sibu doctor` and see drift reported
- confirm no files change until `sibu sync` is explicitly run

## Changing templates

Templates are versioned product artifacts. When changing any file under `templates/`, use the local template-change skill if available and update `templates/manifest.json` in the same change.

Template change checklist:

- Bump the global `templateVersion` when any template changes.
- Bump each changed template's own `version`.
- Add user-facing change notes that explain what changed and why it matters.
- Avoid renaming template paths unless migration or backwards compatibility is handled.
- Run `pnpm verify`.
- Test `sibu init`, `sibu doctor`, and `sibu sync` in a temporary project when practical.

The `changes` entries in `templates/manifest.json` are shown by `sibu sync`, so write them for users rather than as code-level diff notes. If using an AI coding agent, explicitly ask it to use the local template-change skill before editing templates.
