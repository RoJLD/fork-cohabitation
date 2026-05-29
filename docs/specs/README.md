# Specs

Specs are the **durable record of *why* and *what*** a feature is.
Plans are the throwaway execution scripts for *how*. Plans get deleted;
specs live forever and accrete into the project's design documentation.

## Mandatory before any implementation plan

**Before invoking the `superpowers:writing-plans` skill** (or otherwise
drafting an implementation plan) for any feature, refactor, or architectural
change, you MUST first write or update a spec under `docs/specs/`.

A spec is **required** when:

- The change touches more than one file or one module's public surface.
- The change introduces a new concept, endpoint, component, or data flow.
- The change is something the user described in 2+ sentences of intent.
- You are about to use `writing-plans`, `brainstorming`, or
  `subagent-driven-development`.

A spec is **not** required for bug fixes, one-line tweaks, doc fixes,
or dependency bumps — go straight to the change and update CHANGELOG.

## Naming

```
docs/specs/YYYY-MM-DD-<slug>.md
```

The date is the **spec creation date**, NOT the ship date. It never
changes when the spec is revised — the date is the historical anchor.

## Structure

Use [`_template.md`](_template.md) as the starting point. The structure
covers: status, context, architecture, tests, definition of done,
out-of-scope, and amendment sections (`## Update YYYY-MM-DD`).

## Historicization rule (never delete a spec)

Specs are **append-only history**. Once written, a spec stays in this
directory forever, even after the feature ships, is renamed, or is
removed. They are the audit trail of design decisions.

When a shipped feature changes substantially, do NOT silently rewrite
the original spec. Two acceptable patterns:

- **Amend in place** — add a `## Update YYYY-MM-DD — <reason>` section
  at the bottom for clarifications, corrections, scope creep discovered
  late. The original body stays as-is.
- **Successor spec** — for genuine redesigns, write a new spec
  (`YYYY-MM-DD-<slug>-v2.md` or a fresh slug) with a `Supersedes:
  <old-spec-filename>` line near the top. Mark the old spec
  `Status: superseded by <new-spec-filename>` but leave its body intact.

## Maintenance rule (specs track reality)

When a feature changes, **the relevant spec is updated in the same
commit / PR as the code change** — same way `CHANGELOG.md` and
`docs/roadmap.md` are. A code change without the spec update is an
incomplete change.

If a spec becomes wrong and you don't have time to fix it, add a
`> WARNING — STALE — see <reason>` banner at the top rather than leaving
silent rot.

## Status field

Every spec has a `Status:` line near the top. Allowed values:

| Status | Meaning |
|---|---|
| `draft` | Being written, design not yet locked. |
| `current` | Shipped and reflects current code. The load-bearing kind. |
| `superseded by <filename>` | Replaced by a later spec; kept for history. |
| `withdrawn` | Decided not to ship; kept so the rejection reasoning survives. |
| `stale` | Code has drifted; needs an update or successor. Flag with banner. |

## Why specs are separate from ADRs, roadmap, CHANGELOG

| File | Question | Lifetime |
|---|---|---|
| `docs/specs/*` | Why & what (per feature) | Forever, append-only |
| `docs/decisions/*` (ADR) | Why (per architectural decision) | Forever, supersession-tracked |
| `docs/roadmap.md` | When & priority | Living document |
| `CHANGELOG.md` | What shipped (per version) | Append-only |

Specs link to ADRs they implement and to the roadmap phase they fulfill.
Specs are NOT the user manual (that's `docs/guides/`), NOT the
implementation log (that's commits + CHANGELOG), and NOT the strategic
overview (that's the roadmap).
