# AI agent context for fork-cohabitation

This file is the **canonical project context** for AI agents (Claude, Copilot,
Cursor, etc.). Read it at the start of every session. See `CLAUDE.md` for a
short pointer to this file.

## What this project is

`fork-cohabitation` is a generic, config-driven CLI (`cohabit`) for managing
the cohabitation of a fork with its upstream: drift detection, bump dry-runs,
and release watching. Zero runtime dependencies, Node ESM.

Extracted from the gitnexus cohabitation mechanism (see the gitnexus specs:
`../gitnexus/docs/superpowers/specs/2026-05-29-fork-cohabitation-extraction-design.md`).

Strategic overview: see [docs/roadmap.md](docs/roadmap.md).

## File layout

```
.
├── bin/cohabit.mjs          # CLI entry point
├── src/
│   ├── config.mjs           # per-repo config loader (cohabitation.config.json)
│   ├── registry.mjs         # multi-repo registry loader (repos.json)
│   ├── drift.mjs            # drift detection pure functions
│   ├── release-watch.mjs    # upstream release watching pure functions
│   └── bump.mjs             # bump dry-run pure functions
├── tests/
│   ├── unit/                # pure-function unit tests
│   └── parity/              # parity oracle tests (extracted vs gitnexus)
├── docs/
│   ├── roadmap.md           # strategic overview, phase status
│   ├── decisions/           # numbered ADRs
│   ├── specs/               # feature specs (YYYY-MM-DD-<slug>.md)
│   └── guides/              # user-facing docs
├── notes/                   # PRIVATE working notes (gitignored)
├── repos.json               # multi-repo registry
├── CHANGELOG.md             # version history (Keep a Changelog format)
└── package.json             # Node project config
```

## Common commands

```bash
npm ci                            # install dev deps
npm test                          # run all tests (Vitest)
node bin/cohabit.mjs drift <repo>
node bin/cohabit.mjs bump <repo> <tag>
node bin/cohabit.mjs watch <repo>|--all|--due
npm run watch:due                 # shorthand for watch --due
npm run watch:all                 # shorthand for watch --all
```

## Conventions

- **Commit messages**: Conventional Commits (`feat(scope): description`)
- **Commit identity**: `roblastar@live.fr` / `Robin DENIS` — NEVER the Alten
  work email (`robin.denis@alten.com`)
- **ADRs**: numbered, with `## Revisit if` section. Template:
  `docs/decisions/_template.md`
- **Specs**: `docs/specs/YYYY-MM-DD-<slug>.md` — see the **Specs** section below
- **Notes**: `notes/` is gitignored — private working notes. Promote to `docs/`
  when stable

## Specs (mandatory before any implementation plan)

This project follows a **spec-before-plan** discipline. Before drafting an
implementation plan (e.g. via Claude's `superpowers:writing-plans` skill, or
any equivalent multi-step planning workflow), you MUST first write or update a
spec under `docs/specs/`. Full rules: [`docs/specs/README.md`](docs/specs/README.md).

Operational summary:

- **When required**: any change touching > 1 file or > 1 module's public
  surface; new concept/endpoint/component/data flow; anything the user described
  in 2+ sentences of intent; before using `writing-plans`, `brainstorming`, or
  `subagent-driven-development`.
- **When not required**: bug fixes, one-line tweaks, doc fixes, dependency bumps.
- **Naming**: `docs/specs/YYYY-MM-DD-<slug>.md` (creation date, immutable).
- **Template**: copy [`docs/specs/_template.md`](docs/specs/_template.md).
- **Historicization**: specs are **append-only history**. Never delete. For
  substantive changes, add a `## Update YYYY-MM-DD — <reason>` section at the
  bottom, OR write a successor spec with `Supersedes:` linking back.
- **Maintenance**: when a feature changes, the relevant spec is updated **in the
  same commit as the code change**.

## Do's

- Read `docs/roadmap.md` before suggesting features
- Check `docs/decisions/` for the "why" behind existing choices
- Write or update a spec **before** any non-trivial plan
- Update CHANGELOG.md under `[Unreleased]` for any user-facing change

## Don'ts

- Don't draft a multi-file implementation plan without writing the spec first
- Don't delete or silently rewrite an existing spec
- Don't add features without checking the out-of-scope appendix in roadmap.md
- Don't rewrite `tests/` without a good reason — they exist as guard rails
- Don't commit `notes/` content (it's gitignored for a reason)
- Don't suppress warnings, errors, or test failures

## Memory (if using Claude)

This project has a persistent memory at:
`~/.claude/projects/c--Users-rdenis-VScode-fork-cohabitation/memory/`
