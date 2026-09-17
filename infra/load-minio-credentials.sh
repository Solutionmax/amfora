#!/bin/sh
# Load storage system credentials and export as environment variables

CREDENTIALS_FILE="/app/server/.minio-credentials"

if [ "$ENABLE_S3" = "true" ]; then
    # External S3 is configured by the operator's own S3_* env vars. Never load a
    # (possibly stale, left over from a prior internal-storage run) credentials file
    # here, or it would silently overwrite those settings with the internal MinIO ones.
    echo "[AMFORA] External S3 enabled (ENABLE_S3=true), skipping internal storage credentials"
elif [ -f "$CREDENTIALS_FILE" ]; then
    echo "[AMFORA] Loading storage system credentials..."
    
    # Read and export each line
    while IFS= read -r line; do
        # Skip empty lines and comments
        case "$line" in
            ''|'#'*) continue ;;
        esac
        
        # Export the variable
        export "$line"
    done < "$CREDENTIALS_FILE"
    
    echo "[AMFORA] ✓ Storage system credentials loaded"
else
    echo "[AMFORA] ⚠ Storage system credentials not found at $CREDENTIALS_FILE"
    echo "[AMFORA] ⚠ No S3 configured - check your setup"
fi


