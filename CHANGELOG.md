# Changelog

All notable changes to `fork-cohabitation` are documented here. This project
follows [Semantic Versioning](https://semver.org/) and the [Keep a
Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [Unreleased]

### Added

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
