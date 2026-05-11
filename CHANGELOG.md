# Changelog

This file is the canonical source for Sibu release notes.
Every release should update this changelog and the matching GitHub Release.
Write or update the changelog entry first, then publish the matching GitHub Release from that same summary.

## 0.10.0 - 2026-05-11

### Added
- clarify framework adapter boundaries

## 0.9.7 - 2026-05-11

### Fixed
- route story planning through executor

## 0.9.6 - 2026-05-08

### Changed
- continue implementation across epics

## 0.9.5 - 2026-05-08

### Changed
- document ddd anti-corruption adapters
- clarify ddd service placement
- define ddd application usecase files

### Removed
- remove implementation plan approval gate

## 0.9.4 - 2026-05-08

### Changed
- strengthen planning interviews

## 0.9.3 - 2026-05-07

### Fixed
- avoid committing ignored story artifacts

## 0.9.2 - 2026-05-07

### Removed
- remove labels from scrum github export

## 0.9.1 - 2026-05-07

### Fixed
- require scrum planner github export gate

## 0.9.0 - 2026-05-07

### Added
- stop github mcp after init
- use github mcp after init
- list selectable mcp servers
- include mcp files in doctor and sync
- select mcp servers during init
- render github mcp config targets
- add github mcp catalog and state

### Changed
- record reviewed scrum planner template
- update scrum planner template metadata
- add scrum planner GitHub export guidance

### Fixed
- use hosted GitHub MCP configs

## 0.8.0 - 2026-05-06

### Added
- expose database skills in commands
- add database skill planning state
- add postgresql expert skill template

### Changed
- update sibu template state

## 0.7.0 - 2026-05-06

### Added
- update story plan execution workflow
- route deep module map workflow
- add deep module map writer template

### Changed
- validate deep module reorganization
- move maintainer release support
- route prompt consumers to interactive guidance
- move prompt ui behavior
- wire cli dispatch to modules
- move sync review workflows
- move skill selection workflows
- move adoption and health diagnosis workflows
- move version advisory module
- move workflow state registry module
- approve template target validation step
- move workflow target planning
- move workflow target catalog
- move template catalog rendering
- approve source boundary validation step
- plan deep module reorganization
- add deep module placeholders
- align deep module template wording
- add deep module map
- refresh sibu state
- update sibu workflow state
- record final module map validation
- record product context cleanup validation
- clean module map wording
- record pipeline module manifest
- update adjacent module map wording
- update planning module boundaries
- update technical design module guidance
- update feature brief module guidance
- record architecture guidance manifest
- sync local command pattern guidance
- update ddd hexagonal module guidance
- update command pattern module guidance
- record deep module validation review
- update local deep module workflow

### Removed
- remove legacy template target files
- remove obsolete product context artifacts

### Fixed
- include admin runtime files in package
- register deep module map workflow skill

## 0.6.0 - 2026-05-04

### Added
- preserve product contexts during execution
- preserve product contexts in implementation plans
- align command pattern with product contexts
- align ddd hexagonal with product contexts
- preserve product contexts in technical designs
- make feature briefs require product contexts
- add product context map writer workflow

### Changed
- record reviewed workflow template updates
- add contract pipeline planning artifacts
- validate pipeline contract metadata
- update pipeline contract template metadata
- approve planning execution contract validation
- add contract to implementation executor template
- add contract to implementation planner template
- add contract to scrum planner template
- approve product design contract validation
- add contracts to design pipeline templates
- add contracts to product pipeline templates
- update workflow skill templates
- validate product context routing notes
- note product context routing update
- route product context map workflow
- validate implementation context preservation
- note implementation context template updates
- validate architecture context guidance
- note architecture context template updates
- validate product context planning skills
- note product context template updates
- validate product context lifecycle
- cover product context doctor drift
- cover product context skill sync drift
- cover product context skill state registration
- validate product context manifest metadata
- mark product context writer plan approved
- updates sibu templates

## 0.5.3 - 2026-04-30

### Fixed
- prevent generated artifacts in skill responses

## 0.5.2 - 2026-04-30

### Changed
- clarify step executor commit behavior
- syncs with latest sibu version

## 0.5.1 - 2026-04-30

### Changed
- finalize token conscious workflow updates
- validate targeted skill guidance
- update skill template metadata
- minimize executor step reports
- tighten artifact writer final responses
- update template metadata for context budget guidance
- add global context budget guidance
- validate token inventory scope
- add token inventory quality guardrails
- add token consumption inventory

### Removed
- remove brittle manifest version assertion

### Fixed
- validate publish readiness in admin flow
- restore unrelated planning artifacts

## 0.5.0 - 2026-04-29

### Added
- select workflow skills during init

### Changed
- update pnpm package manager version

## 0.4.2 - 2026-04-29

### Fixed
- align release validation with package version
- read Sibu version from package metadata

## 0.4.1 - 2026-04-29

### Changed
- add executor context reuse guidance
- review prompt compression quality
- update workflow template version expectation
- update prompt compression manifest
- inventory compressed workflow templates
- validate skill template compression
- evaluate architecture skill compression
- compress execution prompt skills
- compress planning skill templates
- validate global guidance compression
- tighten optional skill routing
- tighten agent maintenance guidance
- validate prompt audit coverage
- audit prompt skill templates
- audit global prompt routing surfaces
- add prompt compression audit scaffold

## 0.4.0 - 2026-04-28

### Added
- add ux expert selectable skill

## 0.3.0 - 2026-04-28

### Added
- add prompt engineering selectable skill

### Changed
- enable prompt engineering skill
- record template version 46

## 0.2.0 - 2026-04-28

### Added
- support npm otp for maintainer release
- harden maintainer release execution
- log maintainer release workflow progress
- expose maintainer release script
- wire confirmed release execution
- execute release push and github release
- execute release validation and publish
- add release execution model
- add maintainer release entrypoint
- add release preview confirmation gate
- render maintainer release preview
- plan release changelog metadata updates
- plan package version metadata updates
- add release metadata plan models

### Changed
- ignore local npm credentials
- 0.2.0
- 0.2.0
- 0.2.0
- 0.2.0
- 0.2.0
- derive post-update template version expectation
- validate maintainer release exposure
- cover maintainer release script boundaries
- document maintainer release workflow
- validate release preview boundaries
- validate release metadata planning boundaries

## Unreleased

- No unreleased changes yet.

## 0.1.0

- Added the canonical npm install and update path for Sibu.
- Added `sibu doctor` npm update advisory behavior with non-blocking validation paths.
- Added packaged-install validation, post-update drift validation, and supporting documentation for the npm distribution flow.
