# Contributing to fork-cohabitation

## Setup

```bash
git clone https://github.com/RoJLD/fork-cohabitation.git
cd fork-cohabitation
npm ci
npm test
```

## Workflow

1. **Read the roadmap** first: [docs/roadmap.md](docs/roadmap.md) tells
   you what's in flight and what's deliberately out of scope.
2. **Read the relevant ADRs**: [docs/decisions/](docs/decisions/)
   documents the *why* behind architectural choices.
3. **Open an issue first** for non-trivial changes. Don't surprise the
   maintainer with a large PR.
4. **Write tests** for new behavior in `tests/unit/` (pure functions) or
   `tests/parity/` (parity against gitnexus scripts).
5. **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/):
   `<type>(<scope>): <description>`. Types: `feat`, `fix`, `docs`,
   `refactor`, `test`, `chore`, `ci`.
6. **Update CHANGELOG.md** under `[Unreleased]` with your change.
7. **Commit identity**: always use `roblastar@live.fr` / `Robin DENIS`.

## Spec-before-plan discipline

For any non-trivial change (>1 file, new concept, 2+ sentences of intent),
write a spec under `docs/specs/` before drafting an implementation plan.
See [docs/specs/README.md](docs/specs/README.md) for the full contract.

## Decision-level changes

If your contribution touches an architectural decision documented in
`docs/decisions/`, read the ADR's "Revisit if" section first. Supersede
or amend the ADR if the decision changes.

## Code style

- Node ESM, zero runtime deps
- Pure functions separated from I/O (I/O in `run*` wrappers + CLI)
- JSDoc on public functions
- No emoji in code or commits

## Tests

```bash
npm test       # all tests (Vitest)
make test      # same via Makefile
```

## Releasing

Tag with `v{semver}`, push. Update CHANGELOG.md (move `[Unreleased]`
entries under the new version + date).
