#!/usr/bin/env bash
# Builds and signs the update manifest for a published release, then writes it where
# the website serves it from. Vendor side only.
#
#   bash infra/release-manifest.sh X.Y.Z "One line of release notes"
#
# The digest is read back from the registry rather than passed in, so the manifest can
# only ever point at an image that was really published under that tag.
set -euo pipefail

VERSION="${1:?usage: release-manifest.sh <version> [notes]}"
NOTES="${2:-}"
IMAGE="${IMAGE:-ghcr.io/solutionmax/amfora}"
OUT="${OUT:-site/releases/latest.json}"

VERSION="${VERSION#v}"

digest=$(docker buildx imagetools inspect "$IMAGE:$VERSION" 2>/dev/null |
  awk '/^Digest:/ { print $2; exit }')

[ -n "$digest" ] || {
  echo "Could not read a digest for $IMAGE:$VERSION. Is the release image published?" >&2
  exit 1
}

mkdir -p "$(dirname "$OUT")"
node "$(dirname "$0")/sign-release.js" "$VERSION" "$IMAGE" "$digest" "$NOTES" > "$OUT"

echo "wrote $OUT for $VERSION -> $IMAGE@$digest"
