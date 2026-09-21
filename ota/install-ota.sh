#!/usr/bin/env bash
# Installs over the air updating on an Amfora host. Run once, as root, on the machine
# that owns the Docker Compose project. Optional: Amfora runs fine without it and will
# simply report that an update exists instead of offering to apply it.
set -euo pipefail

COMPOSE_DIR="${COMPOSE_DIR:-/opt/amfora}"
STATE_DIR="${STATE_DIR:-$COMPOSE_DIR/ota-state}"
OTA_DIR="${OTA_DIR:-$(cd "$(dirname "$0")" && pwd)}"
# uid/gid the container runs as; must match AMFORA_UID/AMFORA_GID in your compose file,
# or the app cannot write the trigger the host watches for.
CONTAINER_UID="${CONTAINER_UID:-1001}"
CONTAINER_GID="${CONTAINER_GID:-1001}"

[ -f "$COMPOSE_DIR/docker-compose.yaml" ] || {
  echo "No docker-compose.yaml in $COMPOSE_DIR. Set COMPOSE_DIR=/path/to/your/project." >&2
  exit 1
}

mkdir -p "$STATE_DIR"
chown "$CONTAINER_UID:$CONTAINER_GID" "$STATE_DIR"
# Only the container user and root: writing the trigger is asking the host to restart
# the stack, so it must not be writable by anyone else on the machine.
chmod 750 "$STATE_DIR"
chmod +x "$OTA_DIR/apply.sh"

# The marker is how the app knows applying is possible at all. Root owned and read only
# to the container, so a compromised app cannot pretend the host side is present.
printf 'installed_at=%s\ncompose_dir=%s\n' "$(date -Iseconds)" "$COMPOSE_DIR" > "$STATE_DIR/ota-installed"
chmod 644 "$STATE_DIR/ota-installed"

cat > /etc/systemd/system/amfora-ota-apply.service <<EOF
[Unit]
Description=Amfora over the air update (pull the signed release and restart)
[Service]
Type=oneshot
Environment=COMPOSE_DIR=$COMPOSE_DIR STATE_DIR=$STATE_DIR
ExecStart=$OTA_DIR/apply.sh
EOF

cat > /etc/systemd/system/amfora-ota-apply.path <<EOF
[Unit]
Description=Watch for an Amfora update request
[Path]
PathExists=$STATE_DIR/update.trigger
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now amfora-ota-apply.path

cat <<EOF

Over the air updating installed.

One thing left, in $COMPOSE_DIR/docker-compose.yaml, so the app can reach the state dir:

    volumes:
      - $STATE_DIR:/app/server/ota

Then: docker compose up -d

Updates are applied by the host, logged to $STATE_DIR/update.log, and every update
takes a backup of the database into $COMPOSE_DIR/ota-backups first.
EOF
