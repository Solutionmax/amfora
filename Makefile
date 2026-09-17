.PHONY: help build start clean logs stop restart update-version

# Default target
help:
	@echo "🚀 Amfora - Available Commands:"
	@echo ""
	@echo "  make build         - Build local image: make build TAG=version"
	@echo "  make update-version - Update version in all package.json files"
	@echo "  make start         - Start the application using docker compose"
	@echo "  make stop          - Stop the application"
	@echo "  make logs          - Show application logs"
	@echo "  make clean         - Reclaim unused Amfora build cache (keeps data/images)"
	@echo "  make shell         - Access the application container shell"
	@echo ""
	@echo "📁 Scripts location: ./infra/"

# Publishing is explicit: make build TAG=version MODE=push
MODE ?= local
build:
	@bash ./infra/build-docker.sh "$(TAG)" "$(MODE)"

# Update version in all package.json files
update-version:
	@echo "🔄 Updating version numbers..."
	@echo "🏷️  Please enter the new version (e.g., v3.0.0, 3.0-beta):"
	@read -p "Version: " VERSION; \
	if [ -z "$$VERSION" ]; then \
		echo "❌ Error: Version cannot be empty"; \
		exit 1; \
	fi; \
	chmod +x ./infra/update-versions.sh; \
	./infra/update-versions.sh "$$VERSION"

# Start the application
start:
	@echo "🚀 Starting Amfora application..."
	@docker compose up -d

# Stop the application
stop:
	@echo "🛑 Stopping Amfora application..."
	@docker compose down

# Show logs
logs:
	@echo "📋 Showing Amfora logs..."
	@docker compose logs -f

# Only the dedicated builder cache; application volumes/images are retained.
clean:
	@docker buildx prune --builder amfora-builder --force --max-used-space 4GB --reserved-space 1GB --min-free-space 10GB

# Access container shell
shell:
	@echo "🐚 Accessing Amfora container shell..."
	@docker compose exec amfora /bin/sh