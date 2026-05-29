# YYYY-MM-DD — One-line spec title

**Status** : draft  *(draft / current / superseded by <file> / withdrawn / stale)*
**Date** : YYYY-MM-DD  *(creation date — never changes when this spec is revised)*
**Author** : Robin DENIS
**Effort estimate** : ~X days
**Prerequisites** : (other specs / ADRs that must ship first)
**Supersedes** : (filename of an older spec this one replaces, if any)
**Superseded by** : (filename of a newer spec that replaces this one, once that happens)

## 1. Context and motivation

Why does this work exist? What problem does it solve? Who benefits?

## 2. Goal

What success looks like, in one paragraph. The reader should finish
this section knowing what "done" means without scrolling further.

## 3. State of the art (if relevant)

Brief survey of existing solutions.

| Tool | Strengths | Weaknesses |
|---|---|---|
| Alternative A | ... | ... |
| Alternative B | ... | ... |

## 4. Design / architecture

The chosen approach. Be concrete: public functions, data formats,
file layout, sequence of operations.

```js
// Example public API
export function drift(config, upstreamCloneDir) { ... }
```

### Alternatives considered

For each rejected alternative, one paragraph on what it was and *why*
it lost. **This is the part that survives** — future-you needs the
reasoning, not just the outcome.

- **Alt A — <name>**: description. Rejected because <reason>.
- **Alt B — <name>**: description. Rejected because <reason>.

## 5. Limits and edge cases

What configurations does this NOT handle? What edge cases are
deliberately out of scope?

## 6. Tests minimum

Named tests that must exist before this is considered shipped:

| Test name | What it verifies |
|---|---|
| `test_basic_drift` | The happy path works |
| `test_rejects_invalid_config` | Validation surfaces errors clearly |

## 7. Definition of "done"

- [ ] Public API implemented
- [ ] Tests pass (named above)
- [ ] CHANGELOG entry under `[Unreleased]`
- [ ] ADR written if architectural decision involved
- [ ] Documentation updated (README, roadmap)
- [ ] Status field on this spec flipped to `current`

## 8. Out-of-scope (anti-scope-creep)

Things this work deliberately does NOT do.

- (Example) No GUI
- (Example) No remote config storage

## 9. References

- ADR-NNNN — relevant decision
- Roadmap phase
- External references

---

## Update YYYY-MM-DD — <reason for amendment>

*(Append amendment sections below the line above. Never edit the body
of the spec to change a shipped decision — add an Update section
instead, or write a successor spec and flip this one's status to
`superseded by <successor-filename>`.)*

What changed and why.

<!-- Add more Update YYYY-MM-DD sections below as needed -->
