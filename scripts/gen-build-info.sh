#!/usr/bin/env bash
# Regenerates build-info.js from the latest git commit.
# Run manually or via the pre-commit hook.
set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TS="$(git -C "$REPO_ROOT" log -1 --format="%cI")"
COMMIT="$(git -C "$REPO_ROOT" log -1 --format="%h")"
cat > "$REPO_ROOT/build-info.js" <<EOF
window.BUILD_TIMESTAMP = "$TS";
window.BUILD_COMMIT = "$COMMIT";
EOF
echo "build-info.js updated: $COMMIT $TS"
