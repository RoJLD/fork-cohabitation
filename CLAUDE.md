# fork-cohabitation — engineering rules

- **Commit identity MUST be `roblastar@live.fr` / `Robin DENIS`** (never the Alten work email).
- JSON config, zero runtime deps. Pure functions separated from I/O (I/O lives in `run*` wrappers + the CLI).
- TDD: write the failing test first. Tests in `tests/`, run with `npm test`.
