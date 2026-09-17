# Pin the official MinIO images to the exact binaries used by this release.
# Both programs remain unmodified; their licensing and source are documented in NOTICE.
FROM quay.io/minio/minio:RELEASE.2024-10-13T13-34-11Z@sha256:9535594ad4122b7a78c6632788a989b96d9199b483d3bd71a5ceae73a922cdfa AS storage-server
FROM quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z@sha256:a7fe349ef4bd8521fb8497f55c6042871b2ae640607cf99d9bede5e9bdf11727 AS storage-client

FROM node:24-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
  gcompat \
  supervisor \
  curl \
  wget \
  openssl \
  su-exec

# Enable pnpm
RUN corepack enable pnpm

# Install storage system and client from their official images
COPY --from=storage-server /usr/bin/minio /usr/local/bin/minio
COPY --from=storage-client /usr/bin/mc /usr/local/bin/mc
RUN chmod +x /usr/local/bin/minio /usr/local/bin/mc && minio --version && mc --version

# Set working directory
WORKDIR /app

# === SERVER BUILD STAGE ===
FROM base AS server-deps
WORKDIR /app/server

# Copy server package files
COPY apps/server/package*.json ./
COPY apps/server/pnpm-lock.yaml ./

# Install server dependencies
RUN pnpm install --frozen-lockfile

FROM base AS server-builder
WORKDIR /app/server

# Copy server dependencies
COPY --from=server-deps /app/server/node_modules ./node_modules

# Copy server source code
COPY apps/server/ ./

# Generate Prisma client
RUN npx prisma generate

# Build server
RUN pnpm build

# === WEB BUILD STAGE ===
FROM base AS web-deps
WORKDIR /app/web

# Copy web package files
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./

# Install web dependencies
RUN pnpm install --frozen-lockfile

FROM base AS web-builder
WORKDIR /app/web

# Copy web dependencies
COPY --from=web-deps /app/web/node_modules ./node_modules

# Copy web source code
COPY apps/web/ ./

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build web application
RUN pnpm run build

# === PRODUCTION STAGE ===
FROM base AS runner

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_BASE_URL=http://127.0.0.1:3333

# Define build arguments for user/group configuration (defaults to current values)
ARG AMFORA_UID=1001
ARG AMFORA_GID=1001

# Create application user with configurable UID/GID
RUN addgroup --system --gid ${AMFORA_GID} nodejs
RUN adduser --system --uid ${AMFORA_UID} --ingroup nodejs amfora

# Create application directories 
RUN mkdir -p /app/amfora-app /app/web /app/infra /home/amfora/.npm /home/amfora/.cache
RUN chown -R amfora:nodejs /app /home/amfora

# === Copy Server Files to /app/amfora-app (separate from /app/server for bind mounts) ===
WORKDIR /app/amfora-app

# Copy server production files
COPY --from=server-builder --chown=amfora:nodejs /app/server/dist ./dist
COPY --from=server-builder --chown=amfora:nodejs /app/server/node_modules ./node_modules
COPY --from=server-builder --chown=amfora:nodejs /app/server/prisma ./prisma
COPY --from=server-builder --chown=amfora:nodejs /app/server/package.json ./

# Copy password reset script and make it executable
COPY --from=server-builder --chown=amfora:nodejs /app/server/reset-password.sh ./
COPY --from=server-builder --chown=amfora:nodejs /app/server/src/scripts/ ./src/scripts/
RUN chmod +x ./reset-password.sh

# Copy seed file to the shared location for bind mounts
RUN mkdir -p /app/server/prisma
COPY --from=server-builder --chown=amfora:nodejs /app/server/prisma/seed.js /app/server/prisma/seed.js

# === Copy Web Files ===
WORKDIR /app/web

# Copy web production files
COPY --from=web-builder --chown=amfora:nodejs /app/web/public ./public
COPY --from=web-builder --chown=amfora:nodejs /app/web/.next/standalone ./
COPY --from=web-builder --chown=amfora:nodejs /app/web/.next/static ./.next/static

# === Setup Supervisor ===
WORKDIR /app

# Create supervisor configuration
RUN mkdir -p /etc/supervisor/conf.d

# Copy server start script and configuration files
COPY infra/server-start.sh /app/server-start.sh
COPY infra/start-minio.sh /app/start-minio.sh
COPY infra/minio-setup.sh /app/minio-setup.sh
COPY infra/load-minio-credentials.sh /app/load-minio-credentials.sh
COPY infra/configs.json /app/infra/configs.json
COPY infra/providers.json /app/infra/providers.json
COPY infra/check-missing.js /app/infra/check-missing.js
RUN chmod +x /app/server-start.sh /app/start-minio.sh /app/minio-setup.sh /app/load-minio-credentials.sh
RUN chown -R amfora:nodejs /app/server-start.sh /app/start-minio.sh /app/minio-setup.sh /app/load-minio-credentials.sh /app/infra

# Copy supervisor configuration
COPY infra/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create main startup script
COPY <<EOF /app/start.sh
#!/bin/sh
set -e

echo "Starting Amfora Application..."
echo "Storage Mode: \${ENABLE_S3:-false}"
echo "Secure Site: \${SECURE_SITE:-false}"
echo "Encryption: \${DISABLE_FILESYSTEM_ENCRYPTION:-true}"
echo "Database: SQLite"

# Set global environment variables
export DATABASE_URL="file:/app/server/prisma/amfora.db"
export NEXT_PUBLIC_DEFAULT_LANGUAGE=\${DEFAULT_LANGUAGE:-en-US}

# Ensure /app/server directory exists for bind mounts
mkdir -p /app/server/uploads /app/server/temp-uploads /app/server/prisma /app/server/minio-data

# Installations created before the rename carry the database under its old file name.
# Move it across once so that an upgrade keeps its data instead of seeding an empty app.
if [ ! -f /app/server/prisma/amfora.db ] && [ -f /app/server/prisma/palmr.db ]; then
    echo "   📦 Migrating database file to its new name..."
    mv /app/server/prisma/palmr.db /app/server/prisma/amfora.db
    [ -f /app/server/prisma/palmr.db-wal ] && mv /app/server/prisma/palmr.db-wal /app/server/prisma/amfora.db-wal
    [ -f /app/server/prisma/palmr.db-shm ] && mv /app/server/prisma/palmr.db-shm /app/server/prisma/amfora.db-shm
fi

# CRITICAL: Fix permissions BEFORE starting any services
# This runs on EVERY startup to handle updates and corrupted metadata
echo "🔐 Fixing permissions for internal storage..."

# USE ENVIRONMENT VARIABLES: Allow runtime UID/GID configuration
# Falls back to amfora user's UID/GID if not specified
TARGET_UID=\${AMFORA_UID:-\$(id -u amfora 2>/dev/null || echo "1001")}
TARGET_GID=\${AMFORA_GID:-\$(id -g amfora 2>/dev/null || echo "1001")}
echo "   Target user: amfora (UID:\$TARGET_UID, GID:\$TARGET_GID)"

# ALWAYS remove storage system metadata to prevent corruption issues
# This is safe - storage system recreates it automatically
# User data (files) are NOT in .minio.sys, they're safe
if [ -d "/app/server/minio-data/.minio.sys" ]; then
    echo "   🧹 Cleaning storage system metadata (safe, auto-regenerated)..."
    rm -rf /app/server/minio-data/.minio.sys 2>/dev/null || true
fi

# SMART CHOWN: Only run expensive recursive chown when UID/GID changed
# This dramatically speeds up subsequent starts
UIDGID_MARKER="/app/server/.amfora-uidgid"
CURRENT_OWNER="\$TARGET_UID:\$TARGET_GID"
NEEDS_CHOWN=false

if [ -f "\$UIDGID_MARKER" ]; then
    STORED_OWNER=\$(cat "\$UIDGID_MARKER" 2>/dev/null || echo "")
    if [ "\$STORED_OWNER" != "\$CURRENT_OWNER" ]; then
        echo "   📝 UID/GID changed (\$STORED_OWNER → \$CURRENT_OWNER)"
        NEEDS_CHOWN=true
    else
        echo "   ✓ UID/GID unchanged (\$CURRENT_OWNER), skipping chown"
    fi
else
    echo "   📝 First run or marker missing, will set ownership"
    NEEDS_CHOWN=true
fi

if [ "\$NEEDS_CHOWN" = "true" ]; then
    echo "   🔧 Setting ownership (this may take a moment on first run)..."
    
    # Only chown the directories that need it
    chown \$TARGET_UID:\$TARGET_GID /app/server 2>/dev/null || true
    
    # For most directories, just chown the directory itself (fast)
    for dir in uploads temp-uploads; do
        if [ -d "/app/server/\$dir" ]; then
            chown \$TARGET_UID:\$TARGET_GID "/app/server/\$dir" 2>/dev/null || true
        fi
    done
    
    # For prisma directory, we need recursive chown for database files
    if [ -d "/app/server/prisma" ]; then
        echo "   🔧 Fixing database permissions..."
        chown -R \$TARGET_UID:\$TARGET_GID "/app/server/prisma" 2>/dev/null || true
    fi
    
    # For minio-data, we NEED recursive chown because MinIO creates subdirectories
    # and needs write access to all of them
    if [ -d "/app/server/minio-data" ]; then
        echo "   🔧 Fixing MinIO storage permissions..."
        chown -R \$TARGET_UID:\$TARGET_GID "/app/server/minio-data" 2>/dev/null || true
    fi
    
    # Save current UID/GID to marker
    echo "\$CURRENT_OWNER" > "\$UIDGID_MARKER"
    chown \$TARGET_UID:\$TARGET_GID "\$UIDGID_MARKER" 2>/dev/null || true
    
    echo "   ✅ Ownership updated and cached"
fi

chmod 755 /app/server 2>/dev/null || echo "   ⚠️  chmod skipped"

# Verify critical directories are writable
if touch /app/server/.test-write 2>/dev/null; then
    rm -f /app/server/.test-write
    echo "   ✅ Storage directory is writable"
else
    echo "   ❌ FATAL: /app/server is NOT writable!"
    echo "   Check Docker volume permissions"
    ls -la /app/server 2>/dev/null || true
fi

echo "✅ Storage ready, starting services..."

# Start supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /app/start.sh

# Create volume mount points for bind mounts
VOLUME ["/app/server"]

# Expose ports
EXPOSE 3333 5487 9379 9378

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5487 || exit 1

# Start application
CMD ["/app/start.sh"]