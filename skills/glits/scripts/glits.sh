#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export GLITS_CONFIG="${GLITS_CONFIG:-${ROOT}/glits.config.js}"

if [[ ! -f "$GLITS_CONFIG" ]]; then
  echo "Missing config: $GLITS_CONFIG" >&2
  exit 1
fi

CLI="${ROOT}/cli/bin/glits.js"
if [[ ! -f "$CLI" ]]; then
  echo "glits CLI missing in skill bundle" >&2
  exit 1
fi

if [[ ! -d "${ROOT}/cli/node_modules" ]]; then
  npm install --prefix "${ROOT}/cli" --omit=dev --silent
fi

exec node "$CLI" "$@"