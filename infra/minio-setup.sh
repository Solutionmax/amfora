#!/bin/sh
# Storage System Automatic Setup Script
# This script automatically configures storage system on first boot
# No user intervention required

set -e

# Skip internal storage setup when external S3 is configured. Internal MinIO never
# starts in this mode (see start-minio.sh), and creating .minio-credentials here would
# make load-minio-credentials.sh overwrite the operator's external S3 settings.
if [ "$ENABLE_S3" = "true" ]; then
    echo "[STORAGE-SYSTEM-SETUP] External S3 enabled (ENABLE_S3=true)"
    echo "[STORAGE-SYSTEM-SETUP] Skipping internal storage setup"
    exit 0
fi

# Configuration
MINIO_BUCKET_EXPLICIT="${MINIO_BUCKET:-}"
MINIO_DATA_DIR="${MINIO_DATA_DIR:-/app/server/minio-data}"
MINIO_ROOT_USER="amfora-storage-admin"
MINIO_ROOT_PASSWORD="$(cat /app/server/.minio-root-password 2>/dev/null || echo 'password-not-generated')"
MINIO_BUCKET="${MINIO_BUCKET:-amfora-files}"
# Preserve an existing installation's configured bucket when no override is supplied.
LEGACY_BUCKET="$(sed -n 's/^S3_BUCKET_NAME=//p' /app/server/.minio-credentials 2>/dev/null || true)"
MINIO_INITIALIZED_FLAG="/app/server/.minio-initialized"
MINIO_CREDENTIALS="/app/server/.minio-credentials"

echo "[STORAGE-SYSTEM-SETUP] Starting storage system configuration..."

# Create data directory
mkdir -p "$MINIO_DATA_DIR"

# Wait for storage system to start (managed by supervisor)
echo "[STORAGE-SYSTEM-SETUP] Waiting for storage system to start..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://127.0.0.1:9379/minio/health/live > /dev/null 2>&1; then
        echo "[STORAGE-SYSTEM-SETUP]   ✓ Storage system is responding"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[STORAGE-SYSTEM-SETUP]   Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "[STORAGE-SYSTEM-SETUP] ✗ Storage system failed to start"
    exit 1
fi

# Configure storage client (mc) - Run as target UID/GID
echo "[STORAGE-SYSTEM-SETUP] Configuring storage client..."

# Get target UID/GID from environment or default
TARGET_UID=${AMFORA_UID:-${MINIO_UID:-1001}}
TARGET_GID=${AMFORA_GID:-${MINIO_GID:-1001}}

# Ensure home directory exists with correct ownership
if [ "$(id -u)" = "0" ]; then
    mkdir -p /home/amfora/.mc
    chown -R $TARGET_UID:$TARGET_GID /home/amfora 2>/dev/null || true
fi

# Run mc commands as target user
# mc writes its config under $HOME. Without these, su-exec keeps root's HOME and mc tries
# to create /.mc, which fails on hosts that mount the data directory read only for root
# (reported on UNRAID as: mc: <ERROR> mkdir /.mc: permission denied).
run_as_target() {
    if [ "$(id -u)" = "0" ]; then
        su-exec $TARGET_UID:$TARGET_GID env HOME=/home/amfora MC_CONFIG_DIR=/home/amfora/.mc "$@"
    else
        HOME=/home/amfora MC_CONFIG_DIR=/home/amfora/.mc "$@"
    fi
}

# Configure with verbose error output
if ! run_as_target mc alias set amfora-local http://127.0.0.1:9379 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>&1; then
    echo "[STORAGE-SYSTEM-SETUP] ✗ Failed to configure storage client"
    echo "[STORAGE-SYSTEM-SETUP] Debug: UID/GID=$TARGET_UID:$TARGET_GID, User=$(whoami)"
    exit 1
fi

# An installation created before the rename keeps its files in the old bucket. Never
# create a second, empty bucket next to it: that would hide every existing upload.
if [ -z "$MINIO_BUCKET_EXPLICIT" ] && ! run_as_target mc ls amfora-local/$MINIO_BUCKET > /dev/null 2>&1; then
    if [ -n "$LEGACY_BUCKET" ] && run_as_target mc ls "amfora-local/$LEGACY_BUCKET" > /dev/null 2>&1; then
        echo "[STORAGE-SYSTEM-SETUP]   Found existing bucket '$LEGACY_BUCKET', keeping it"
        MINIO_BUCKET="$LEGACY_BUCKET"
    fi
fi

# Create bucket (idempotent - won't fail if exists)
echo "[STORAGE-SYSTEM-SETUP] Ensuring storage bucket exists: $MINIO_BUCKET..."
if run_as_target mc ls amfora-local/$MINIO_BUCKET > /dev/null 2>&1; then
    echo "[STORAGE-SYSTEM-SETUP]   ✓ Bucket '$MINIO_BUCKET' already exists"
else
    echo "[STORAGE-SYSTEM-SETUP]   Creating bucket '$MINIO_BUCKET'..."
    run_as_target mc mb "amfora-local/$MINIO_BUCKET" 2>/dev/null || {
        echo "[STORAGE-SYSTEM-SETUP] ✗ Failed to create bucket"
        exit 1
    }
    echo "[STORAGE-SYSTEM-SETUP]   ✓ Bucket created"
fi

# Set bucket policy to private (always reapply)
echo "[STORAGE-SYSTEM-SETUP] Setting bucket policy..."
run_as_target mc anonymous set none "amfora-local/$MINIO_BUCKET" 2>/dev/null || true

# Save credentials for Amfora to use
echo "[STORAGE-SYSTEM-SETUP] Saving credentials to $MINIO_CREDENTIALS..."

# Create credentials file
cat > "$MINIO_CREDENTIALS" <<EOF
S3_ENDPOINT=127.0.0.1
S3_PORT=9379
S3_ACCESS_KEY=$MINIO_ROOT_USER
S3_SECRET_KEY=$MINIO_ROOT_PASSWORD
S3_BUCKET_NAME=$MINIO_BUCKET
S3_REGION=us-east-1
S3_USE_SSL=false
S3_FORCE_PATH_STYLE=true
EOF

# Verify file was created
if [ ! -f "$MINIO_CREDENTIALS" ]; then
    echo "[STORAGE-SYSTEM-SETUP] ✗ ERROR: Failed to create credentials file!"
    echo "[STORAGE-SYSTEM-SETUP] Check permissions on /app/server directory"
    exit 1
fi

# Holds the storage secret key, so it is readable by the application user only.
chmod 600 "$MINIO_CREDENTIALS" 2>/dev/null || true
chown $TARGET_UID:$TARGET_GID "$MINIO_CREDENTIALS" 2>/dev/null || true
echo "[STORAGE-SYSTEM-SETUP] ✓ Credentials file created and readable"

echo "[STORAGE-SYSTEM-SETUP] ✓✓✓ Storage system configured successfully!"
echo "[STORAGE-SYSTEM-SETUP]   Bucket: $MINIO_BUCKET"
echo "[STORAGE-SYSTEM-SETUP]   Credentials: saved to .minio-credentials"
echo "[STORAGE-SYSTEM-SETUP]   Amfora will use storage system"

exit 0

