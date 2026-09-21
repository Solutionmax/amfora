#!/usr/bin/env bash
# Applies an Amfora update on the host. Started by the systemd path unit the moment
# the app drops ota/update.trigger, so the container never needs the Docker socket.
#
# The trigger only says which version the app wants. This script fetches and verifies
# the signed manifest itself: the trigger is written by the very application being
# replaced, so it is a request, not an instruction.
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/opt/amfora}"
STATE_DIR="${STATE_DIR:-$COMPOSE_DIR/ota-state}"
BACKUP_DIR="${BACKUP_DIR:-$COMPOSE_DIR/ota-backups}"
DATA_DIR="${DATA_DIR:-/data/amfora}"
SERVICE="${SERVICE:-amfora}"
MANIFEST_URL="${MANIFEST_URL:-https://amfora.solutionmax.net/releases/latest.json}"
PUBLIC_KEY_HEX="${PUBLIC_KEY_HEX:-3c18a8768933ddafb3fc0ac13c972c6ba252e8bfb036638b8e955f2f37fae9b4}"
KEEP_BACKUPS="${KEEP_BACKUPS:-3}"
LOG="$STATE_DIR/update.log"

exec >>"$LOG" 2>&1
echo "=== update started $(date -Iseconds) ==="

finish() {
  rm -f "$STATE_DIR/update.trigger"
  echo "=== update finished $(date -Iseconds) ==="
}
trap finish EXIT

fail() {
  echo "REFUSED: $*"
  exit 0
}

command -v openssl >/dev/null || fail "openssl is required to verify the release signature"

# --- verify the manifest -----------------------------------------------------
work=$(mktemp -d)
trap 'rm -rf "$work"; finish' EXIT

curl -fsS --max-time 20 "$MANIFEST_URL" -o "$work/manifest" || fail "could not fetch $MANIFEST_URL"

payload_b64=$(cut -d. -f1 "$work/manifest" | tr -d '\n')
signature_b64=$(cut -d. -f2 "$work/manifest" | tr -d '\n')
[ -n "$payload_b64" ] && [ -n "$signature_b64" ] || fail "the manifest is not payload.signature"

# base64url to standard base64, restoring the padding openssl expects.
unb64() {
  local s=${1//-/+}
  s=${s//_//}
  case $(( ${#s} % 4 )) in 2) s="$s==" ;; 3) s="$s=" ;; esac
  printf '%s' "$s" | openssl base64 -d -A
}

unb64 "$payload_b64" > "$work/payload"
unb64 "$signature_b64" > "$work/signature"

# An Ed25519 public key becomes a PEM by prefixing the fixed SPKI header.
printf '%s%s' "302a300506032b6570032100" "$PUBLIC_KEY_HEX" | xxd -r -p > "$work/pub.der"
openssl pkey -pubin -inform DER -in "$work/pub.der" -out "$work/pub.pem"

openssl pkeyutl -verify -pubin -inkey "$work/pub.pem" -rawin \
  -in "$work/payload" -sigfile "$work/signature" >/dev/null || fail "the release signature is not valid"

read_field() {
  python3 -c "
import json,sys
print(json.load(open(sys.argv[1])).get(sys.argv[2], ''))" "$work/payload" "$1"
}

purpose=$(read_field purpose)
version=$(read_field version)
image=$(read_field image)
digest=$(read_field digest)

[ "$purpose" = "amfora-release" ] || fail "manifest purpose is '$purpose', not an Amfora release"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]] || fail "unusable version '$version'"
[[ "$image" =~ ^[a-z0-9._/-]+$ ]] || fail "unusable image '$image'"
[[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail "unusable digest '$digest'"

echo "verified release $version -> $image@$digest"

# --- back up before touching anything ----------------------------------------
# A newer image runs `prisma db push` at startup, so the schema moves forward on its
# own. Moving back does not, which is exactly why this runs before the pull and not
# after. The previous image reference is stored beside it so rolling back is one edit.
mkdir -p "$BACKUP_DIR"
stamp=$(date +%Y%m%d-%H%M%S)
previous=$(docker compose -f "$COMPOSE_DIR/docker-compose.yaml" images -q "$SERVICE" 2>/dev/null || true)
backup="$BACKUP_DIR/amfora-$stamp-before-$version.tgz"

tar czf "$backup" -C "$DATA_DIR" prisma 2>/dev/null || fail "could not back up $DATA_DIR/prisma"
printf 'previous_image_id=%s\nnew_image=%s@%s\nversion=%s\n' "$previous" "$image" "$digest" "$version" \
  > "$BACKUP_DIR/amfora-$stamp-before-$version.txt"
echo "backed up to $backup ($(du -h "$backup" | cut -f1))"

# Keep the newest few; 0 keeps everything.
if [ "$KEEP_BACKUPS" -gt 0 ]; then
  ls -1t "$BACKUP_DIR"/amfora-*.tgz 2>/dev/null | tail -n "+$((KEEP_BACKUPS + 1))" | while read -r old; do
    rm -f "$old" "${old%.tgz}.txt"
    echo "pruned $old"
  done
fi

# --- pull and restart ---------------------------------------------------------
cd "$COMPOSE_DIR"
docker pull "$image@$digest" || fail "could not pull $image@$digest"

# Pin the exact digest that was signed, so a restart later runs the same bytes.
cp docker-compose.yaml "docker-compose.yaml.bak-$stamp"
python3 - "$image@$digest" <<'PY'
import re, sys
new = sys.argv[1]
path = "docker-compose.yaml"
text = open(path).read()
updated, count = re.subn(r"(?m)^(\s*image:\s*).*$", lambda m: m.group(1) + new, text, count=1)
if count != 1:
    raise SystemExit("could not find an image line to pin")
open(path, "w").write(updated)
PY

docker compose up -d "$SERVICE"
echo "now running $version"
