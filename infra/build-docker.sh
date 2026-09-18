#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Local builds are the default; registry publishing must be explicit.
TAG="${1:-}"
MODE="${2:-local}"
if [[ -z "$TAG" || ! "$TAG" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ || ! "$MODE" =~ ^(local|push)$ ]]; then
    echo "Usage: $0 TAG [local|push]" >&2
    exit 2
fi
BUILDER=amfora-builder
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
    docker buildx create --name "$BUILDER" --driver docker-container \
        --buildkitd-config infra/buildkitd.toml >/dev/null
fi
# Bound unused cache after successful and failed builds; never delete images/data.
cleanup() {
    docker buildx prune --builder "$BUILDER" --force \
        --max-used-space 4GB --reserved-space 1GB --min-free-space 10GB || \
        echo "Warning: cache cleanup failed; run make clean." >&2
}
trap cleanup EXIT
REVISION="${SOURCE_REVISION:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
args=(--builder "$BUILDER" --label "org.opencontainers.image.revision=$REVISION")
if [[ "$MODE" == push ]]; then
    args+=(--platform linux/amd64,linux/arm64 --push \
        -t "ghcr.io/solutionmax/amfora:$TAG" -t ghcr.io/solutionmax/amfora:latest)
else
    args+=(--load -t "amfora:$TAG")
fi
docker buildx build "${args[@]}" .
