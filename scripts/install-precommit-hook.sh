#!/usr/bin/env bash
# install-precommit-hook.sh — Installe le hook pre-commit Σ-PATCH-DIFF-LF-CANONICAL
#
# Doctrine : tout `patches/*.diff` doit être en LF (cf .agent/rules/active/factory_patch_diff_lf_canonical.mdc).
#
# Usage:
#   ./scripts/install-precommit-hook.sh                    # installe dans le repo courant (fork-cohabitation)
#   ./scripts/install-precommit-hook.sh /path/to/GitNexus  # installe dans un fork cible
#
# Idempotent : ré-exécution safe (overwrite du hook).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORK_COHAB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_REPO="${1:-$(pwd)}"

if [ ! -d "$TARGET_REPO/.git" ]; then
  echo "[install-precommit-hook] ERROR: $TARGET_REPO is not a git repo (no .git/ dir)" >&2
  exit 1
fi

HOOK_PATH="$TARGET_REPO/.git/hooks/pre-commit"
CHECKER="$FORK_COHAB_ROOT/scripts/check-patch-lf.mjs"

if [ ! -f "$CHECKER" ]; then
  echo "[install-precommit-hook] ERROR: $CHECKER not found" >&2
  exit 1
fi

cat > "$HOOK_PATH" <<HOOK
#!/usr/bin/env bash
# pre-commit hook installed by fork-cohabitation scripts/install-precommit-hook.sh
# Enforces Iron Rule Sigma-PATCH-DIFF-LF-CANONICAL.
# To bypass (audit'd): git commit --no-verify
set -e
node "$CHECKER" "$TARGET_REPO" || {
  echo ""
  echo "[pre-commit] CRLF detected in patches/*.diff -- doctrine Sigma-PATCH-DIFF-LF-CANONICAL"
  echo "[pre-commit] Fix: node $CHECKER --fix $TARGET_REPO"
  exit 1
}
HOOK

chmod +x "$HOOK_PATH"
echo "[install-precommit-hook] installed: $HOOK_PATH"
echo "[install-precommit-hook] target repo: $TARGET_REPO"
echo "[install-precommit-hook] checker: $CHECKER"
