#!/bin/bash

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "❌ Error: Version parameter is required"
    echo "Usage: $0 <version>"
    echo "Example: $0 v3.0.0"
    exit 1
fi

echo "🔄 Updating version to $VERSION in all package.json files..."

update_package_json() {
    local file=$1
    local app_name=$2
    
    if [ -f "$file" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$file"
        else
            sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$file"
        fi
        
        echo "✅ Updated $app_name: $file"
    else
        echo "❌ Warning: $file not found"
    fi
}

update_package_json "apps/web/package.json" "Web App"
update_package_json "apps/server/package.json" "API Server"
update_package_json "./package.json" "Monorepo"

# The installer and the sample compose file start new installs on this release.
PLAIN="${VERSION#v}"
sed -i "s/^    AMFORA_VERSION=\".*\"/    AMFORA_VERSION=\"$PLAIN\"/" site/get
sed -i "s#ghcr.io/solutionmax/amfora:[0-9][0-9.]*}#ghcr.io/solutionmax/amfora:$PLAIN}#" docker-compose.yaml
echo "✅ Updated site/get and docker-compose.yaml to $PLAIN"

echo "🎉 Version update completed!"
echo "📦 All package.json files now have version: $VERSION" 