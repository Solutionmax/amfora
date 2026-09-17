.PHONY: help build start clean logs stop restart update-version

# Default target
help:
	@echo "🚀 Amfora - Available Commands:"
	@echo ""
	@echo "  make build         - Build Docker image with multi-platform support"
	@echo "  make update-version - Update version in all package.json files"
	@echo "  make start         - Start the application using docker-compose"
	@echo "  make stop          - Stop all running containers"
	@echo "  make logs          - Show application logs"
	@echo "  make clean         - Clean up containers and images"
	@echo "  make shell         - Access the application container shell"
	@echo ""
	@echo "📁 Scripts location: ./infra/"

# Build Docker image using the build script
build:
	@echo "🏗️  Building Amfora Docker image..."
	@echo "📝 This will update version numbers in all package.json files before building"
	@echo ""
	@chmod +x ./infra/update-versions.sh
	@chmod +x ./infra/build-docker.sh
	@echo "🔄 Starting build process..."
	@./infra/build-docker.sh

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
	@docker-compose up -d

# Stop the application
stop:
	@echo "🛑 Stopping Amfora application..."
	@docker-compose down

# Show logs
logs:
	@echo "📋 Showing Amfora logs..."
	@docker-compose logs -f

# Clean up containers and images
clean:
	@echo "🧹 Cleaning up Docker containers and images..."
	@docker-compose down -v
	@docker system prune -f
	@echo "✅ Cleanup completed!"

# Access container shell
shell:
	@echo "🐚 Accessing Amfora container shell..."
	@docker-compose exec amfora /bin/sh