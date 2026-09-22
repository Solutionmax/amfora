#!/bin/sh
set -e

echo "🚀 Starting Amfora Server..."

# Wait for storage system credentials to be ready (if using internal storage)
if [ "${ENABLE_S3}" != "true" ]; then
    echo "⏳ Waiting for internal storage to initialize..."
    MAX_WAIT=60
    WAIT_COUNT=0
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if [ -f "/app/server/.minio-credentials" ]; then
            echo "✅ Internal storage ready!"
            break
        fi
        
        WAIT_COUNT=$((WAIT_COUNT + 1))
        echo "   Waiting for storage... ($WAIT_COUNT/$MAX_WAIT)"
        sleep 1
    done
    
    if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
        echo "⚠️  WARNING: Internal storage not ready after ${MAX_WAIT}s"
        echo "⚠️  Server will start but storage may not work until ready"
    fi
fi

# Load storage system credentials if available
if [ -f "/app/load-minio-credentials.sh" ]; then
    . /app/load-minio-credentials.sh
fi

# Same default as the storage side (Dockerfile start script, minio-setup.sh): the amfora
# user. uid 1000 is "node" in this image, which cannot read the storage credentials.
TARGET_UID=${AMFORA_UID:-$(id -u amfora 2>/dev/null || echo 1001)}
TARGET_GID=${AMFORA_GID:-$(id -g amfora 2>/dev/null || echo 1001)}

if [ -n "$AMFORA_UID" ] || [ -n "$AMFORA_GID" ]; then
    echo "🔧 Runtime UID/GID: $TARGET_UID:$TARGET_GID"
    
    echo "🔐 Updating file ownership..."
    
    # Only chown application files (these are small and fast)
    find /app/amfora-app -maxdepth 2 -exec chown $TARGET_UID:$TARGET_GID {} + 2>/dev/null || echo "⚠️ Some app ownership changes may have failed"
    
    # Home directory is small, safe to chown
    chown -R $TARGET_UID:$TARGET_GID /home/amfora 2>/dev/null || echo "⚠️ Some home directory ownership changes may have failed"
    
    # /app/server is handled by the main startup script with smart marker
    # No need to duplicate the work here
    
    echo "✅ UID/GID configuration completed"
fi

cd /app/amfora-app

export DATABASE_URL="file:/app/server/prisma/amfora.db"

echo "📂 Data directory: /app/server"
echo "💾 Database: $DATABASE_URL"

echo "📁 Creating data directories..."
mkdir -p /app/server/prisma /app/server/uploads /app/server/temp-uploads

if [ "$(id -u)" = "0" ]; then
    echo "🔐 Ensuring proper ownership for critical files..."
    # Ensure base directories exist and have correct ownership
    chown $TARGET_UID:$TARGET_GID /app/server/uploads /app/server/temp-uploads 2>/dev/null || true
    chmod 755 /app/server/uploads /app/server/temp-uploads 2>/dev/null || true
    
    # Critical: Database files need read+write permissions
    if [ -d "/app/server/prisma" ]; then
        chown -R $TARGET_UID:$TARGET_GID /app/server/prisma 2>/dev/null || true
        chmod 750 /app/server/prisma 2>/dev/null || true
        # The database holds password hashes and the JWT secret, so it stays owner only.
        for dbfile in /app/server/prisma/amfora.db /app/server/prisma/amfora.db-wal /app/server/prisma/amfora.db-shm; do
            [ -f "$dbfile" ] && chmod 600 "$dbfile" 2>/dev/null || true
        done
    fi
fi

run_as_user() {
    if [ "$(id -u)" = "0" ]; then
        su-exec $TARGET_UID:$TARGET_GID "$@"
    else
        "$@"
    fi
}

if [ ! -f "/app/server/prisma/configs.json" ]; then
    echo "📄 Copying configuration files..."
    cp -f /app/infra/configs.json /app/server/prisma/configs.json 2>/dev/null || echo "⚠️ Failed to copy configs.json"
    cp -f /app/infra/providers.json /app/server/prisma/providers.json 2>/dev/null || echo "⚠️ Failed to copy providers.json"
    cp -f /app/infra/check-missing.js /app/server/prisma/check-missing.js 2>/dev/null || echo "⚠️ Failed to copy check-missing.js"
    
    if [ "$(id -u)" = "0" ]; then
        chown $TARGET_UID:$TARGET_GID /app/server/prisma/configs.json /app/server/prisma/providers.json /app/server/prisma/check-missing.js 2>/dev/null || true
    fi
fi

if [ ! -f "/app/server/prisma/amfora.db" ]; then
    echo "🚀 First run detected - setting up database..."
    
    echo "🗄️ Creating database schema..."
    run_as_user npx prisma db push --schema=./prisma/schema.prisma --skip-generate
    
    echo "🌱 Seeding database..."
    run_as_user node ./prisma/seed.js
    
    echo "✅ Database setup completed!"
else
    echo "♻️ Existing database found"

    # The reverse share layout was renamed. Rewrite the stored value before the schema
    # push, so that existing receive pages keep the layout their owner chose.
    echo "🔁 Applying data migrations..."
    if echo "UPDATE reverse_shares SET pageLayout = 'VESSEL' WHERE pageLayout = 'WETRANSFER';" \
        | run_as_user npx prisma db execute --schema=./prisma/schema.prisma --stdin > /dev/null 2>&1; then
        echo "   ✓ Data migrations applied"
    else
        echo "   ⚠️ Data migration skipped (nothing to migrate, or the table does not exist yet)"
    fi

    echo "🔧 Checking for schema updates..."
    run_as_user npx prisma db push --schema=./prisma/schema.prisma --skip-generate
    
    echo "🔍 Checking if new tables need seeding..."
    NEEDS_SEEDING=$(run_as_user node ./prisma/check-missing.js check-seeding 2>/dev/null || echo "true")
    
    if [ "$NEEDS_SEEDING" = "true" ]; then
        echo "🌱 New tables detected or missing data, running seed..."
        
        MISSING_PROVIDERS=$(run_as_user node ./prisma/check-missing.js check-providers 2>/dev/null || echo "Error checking providers")
        MISSING_CONFIGS=$(run_as_user node ./prisma/check-missing.js check-configs 2>/dev/null || echo "Error checking configurations")

        if [ "$MISSING_PROVIDERS" != "No missing providers" ] && [ "$MISSING_PROVIDERS" != "Error checking providers" ]; then
            echo "🔍 $MISSING_PROVIDERS"
        fi
        
        if [ "$MISSING_CONFIGS" != "No missing configurations" ] && [ "$MISSING_CONFIGS" != "Error checking configurations" ]; then
            echo "⚙️ $MISSING_CONFIGS"
        fi
        
        run_as_user node ./prisma/seed.js
        echo "✅ Seeding completed!"
    else
        echo "✅ All tables have data, no seeding needed"
    fi
fi

# Run again now that the database definitely exists: on a first boot the block above ran
# before Prisma created the file, so it would have been left at the default mode.
for dbfile in /app/server/prisma/amfora.db /app/server/prisma/amfora.db-wal /app/server/prisma/amfora.db-shm; do
    [ -f "$dbfile" ] && chmod 600 "$dbfile" 2>/dev/null || true
done

echo "🚀 Starting Amfora server..."

if [ "$(id -u)" = "0" ]; then
    echo "🔽 Dropping privileges to UID:GID $TARGET_UID:$TARGET_GID"
    exec su-exec $TARGET_UID:$TARGET_GID node dist/server.js
else
    exec node dist/server.js
fi