#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${DIR}/.." && pwd)"
QUEUE="${GLITS_QUEUE:-${ROOT}/queue}"
mkdir -p "$QUEUE"
exec "${DIR}/glits.sh" create --queue "$QUEUE" "$@"