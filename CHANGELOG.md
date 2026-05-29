# Changelog

All notable changes to `fork-cohabitation` are documented here. This project
follows [Semantic Versioning](https://semver.org/) and the [Keep a
Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

### Added

- **Containerization**: `Dockerfile` (base `node:22-bookworm-slim` + `git`) +
  `deploy/entrypoint.sh` (runs `cohabit bootstrap` then delegates to the CLI).
- **Deployment recipes** in `deploy/`:
  - `kubernetes/` — reference CronJob, PVC, and example ConfigMap for `repos.json`
  - `docker-compose/` — `docker-compose.yml` with named `work` volume, local build
  - `crontab/` — `docker run` wrapper script, crontab example, systemd service +
    timer
  - `README.md` — deployment guide covering volume semantics, entry modes, exit
    code semantics, auth for private repos, and all three recipes
- **Registry fields `gitUrl` / `ref`**: optional fields in `repos.json` entries.
  When `gitUrl` is set, `cohabit bootstrap` clones or updates the repo into
  `/work/<name>` (relative to the registry dir). `ref` defaults to `"main"`.
- **`cohabit bootstrap` command**: clones/updates all registry entries that have
  a `gitUrl`. Automatically called by the container entrypoint; also runnable
  directly.
- **`COHABIT_REGISTRY` env var**: path to the registry file. Defaults to
  `repos.json` next to the CLI; in the container it is set to `/work/repos.json`.
  Repo paths in the registry are now resolved relative to the registry's directory.

### Changed

### Deprecated

### Removed

### Fixed

### Security

---

## [0.1.0] - 2026-05-29

### Added

- Config-driven cohabitation CLI (`cohabit`) with three commands:
  - `drift <repo>` — detects when committed diffs (`additive-files.diff` /
    `inplace-edits.diff`) no longer match the local upstream clone; exit 0 =
    clean, exit 1 = drift detected.
  - `bump <repo> <tag>` — dry-run bump towards an upstream tag: clones upstream
    into a throwaway directory, applies the additive diff (must be clean), then
    applies the inplace diff with `--3way`, and writes a per-file report
    (`clean` / `conflict` / `fail`). Does not touch the working clone.
  - `watch <repo>|--all|--due` — checks whether a stable release newer than the
    current pin exists upstream; supports `--all` (all registered repos) and
    `--due` (repos whose cadence interval has elapsed).
- Per-repo `cohabitation.config.json` contract: `upstreamUrl`, `cloneDir`,
  `additiveDiff`, `inplaceDiff`, `pinFile`, `pinPattern`.
- Multi-repo `repos.json` registry with `name`, `path`, `tier`, `cadence`
  fields; `--all` and `--due` orchestration iterates over it.
- Pure functions extracted from gitnexus cohabitation scripts
  (`src/config.mjs`, `src/registry.mjs`, `src/drift.mjs`,
  `src/release-watch.mjs`, `src/bump.mjs`).
- Parity oracle tests verifying extracted functions match gitnexus behaviour
  (`tests/parity/`).
- Zero runtime dependencies — Node ESM, dev dependency on Vitest ^2.1.9.

### References

- Extracted from gitnexus cohabitation mechanism; design origin:
  `../gitnexus/docs/superpowers/specs/2026-05-29-fork-cohabitation-extraction-design.md`
