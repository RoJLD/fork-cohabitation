# fork-cohabitation — Roadmap

**Date** : 2026-05-29
**Author** : Robin DENIS
**Last updated** : 2026-05-29

> Living strategic document. Re-edit at every phase transition. NOT a
> spec; specs live in `docs/specs/`. NOT a changelog; that lives in
> `CHANGELOG.md`. This is the strategic overview.

## Vision

Generic, config-driven tooling for any developer who maintains a fork of an
upstream project. Instead of ad-hoc scripts scattered per repo, `fork-cohabitation`
gives a single CLI (`cohabit`) that reads per-repo JSON config and a central
registry — covering drift detection, bump dry-runs, and release watching.
Extracted from the gitnexus cohabitation pattern to be reusable across many repos.

## Positioning

### The wedge

Pure, zero-runtime-dep Node ESM CLI. No daemon, no lock-in, no external service.
The config lives in the fork's own repo; the registry lives here. Works
offline (drift + bump) and with a simple HTTPS check (watch).

### What we are NOT

- Not a full merge-conflict resolver (we detect and report; the human resolves)
- Not a git hosting layer (no GitHub API beyond release tags)
- Not a monorepo manager (each repo is independent; we only aggregate for watch --all)

### Strategic test for new features

"Does this reduce friction in maintaining a fork against upstream, or does it
replicate what git already does?" If the latter, refuse.

## Overview — where we are

```
Phase    Description                          Status     Depends on    Effort
──────────────────────────────────────────────────────────────────────────────
   A     Core CLI (drift / bump / watch)      SHIPPED    —             ~3 days
   B     Second consumer onboarding           PLANNED    A             ~1 day
   Z.1   CI + GitHub Actions                  SHIPPED    —             ~0.5 day
   Z.2   Scheduled watch --due via cron/CI    PLANNED    A, Z.1        ~1 day
```

## Phase A — Core CLI

**Status** : SHIPPED (v0.1.0, 2026-05-29)
**Depends on** : —

### What shipped

- `cohabit drift <repo>` — drift detection (exit 0 / 1)
- `cohabit bump <repo> <tag>` — bump dry-run with per-file report
- `cohabit watch <repo>|--all|--due` — release watching (exit 0 / 10 / 2)
- `cohabitation.config.json` per-repo contract
- `repos.json` multi-repo registry with tier + cadence
- Pure functions extracted from gitnexus; parity oracle tests pass

### Design origin

- `../gitnexus/docs/superpowers/specs/2026-05-29-fork-cohabitation-extraction-design.md`
- `../gitnexus/docs/superpowers/specs/2026-05-29-upstream-cohabitation-contract-design.md`

## Phase B — Second consumer onboarding

**Status** : PLANNED
**Depends on** : A

Onboard a second fork (e.g. `hmm_studio` or another upstream-tracking repo)
to validate that the config contract is truly generic and that `watch --due`
works across two repos with different cadences.

### Definition of "done"

- [ ] Second repo has `cohabitation.config.json`
- [ ] Second repo entry added to `repos.json`
- [ ] `cohabit watch --all` covers both repos
- [ ] CHANGELOG updated

## Phase Z — Cross-cutting

### Z.1 — CI + GitHub Actions (SHIPPED)

Node matrix (20.x / 22.x), `npm ci`, `npm test` on push + PR to main.

### Z.2 — Scheduled watch --due

Trigger `cohabit watch --due` on a cron schedule (GitHub Actions `schedule:`
or a local cron). Outputs a summary and optionally posts a notification.

## Out-of-scope appendix

| Item | Why not | Reconsider if |
|---|---|---|
| Auto-apply bump (non-dry-run) | Too risky to automate; human must review the report | No conflicts in 5 consecutive dry-runs for a given repo |
| GUI / web dashboard | CLI is sufficient for the use case | Multiple non-CLI users |
| GitHub API for PRs | Out of scope for a local drift/watch tool | Explicit request from a second consumer |
| Python / Ruby port | Node ESM is the target stack | Demand from a Python-only consumer |
