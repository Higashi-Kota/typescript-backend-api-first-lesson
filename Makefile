.PHONY: help install build test lint format typecheck clean clean-all fresh \
        docker-up docker-down docker-logs docker-clean \
        db-migrate db-seed db-reset \
        backend-build backend-start frontend-dev

# Default target
help:
	@echo "Beauty Salon Reservation App - Available commands:"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install        - Install all dependencies"
	@echo "  make docker-up      - Start required services (DB, Mail, S3)"
	@echo ""
	@echo "Backend Development:"
	@echo "  make backend-build  - Build backend (recommended for development)"
	@echo "  make backend-start  - Start backend from built dist"
	@echo ""
	@echo "Frontend Development:"
	@echo "  make frontend-dev   - Start frontend dev server"
	@echo ""
	@echo "Build & Test:"
	@echo "  make build         - Build all packages"
	@echo "  make test          - Run all tests"
	@echo "  make lint          - Run linter"
	@echo "  make format        - Format code"
	@echo "  make typecheck     - Run type checking"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make clean-all     - Clean everything including node_modules"
	@echo "  make fresh         - Clean everything and reinstall"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up     - Start all services with Docker Compose"
	@echo "  make docker-down   - Stop all Docker services"
	@echo "  make docker-build  - Build Docker images"
	@echo "  make docker-logs   - Show Docker logs"
	@echo "  make docker-clean  - Clean Docker volumes and images"
	@echo ""
	@echo "Database:"
	@echo "  make db-migrate    - Run database migrations"
	@echo "  make db-seed       - Seed database with sample data"
	@echo "  make db-reset      - Reset database (drop, create, migrate, seed)"
	@echo ""

# Installation
install:
	pnpm install

# Frontend Development
frontend-dev:
	@echo "Starting frontend development server..."
	pnpm --filter './frontend/apps/*' run dev

# Backend build and run
backend-build:
	@echo "Cleaning previous builds..."
	pnpm --filter './backend/**' run clean
	@echo "Building backend packages sequentially..."
	pnpm build:backend:packages
	@echo "Waiting for build to stabilize..."
	@sleep 2
	@echo "Building backend server..."
	pnpm build:backend:server
	@echo "Backend build complete!"

backend-start:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Checking database connection..."
	@docker-compose exec -T postgres pg_isready -U postgres || echo "Database might not be ready yet"
	@echo "Starting backend server with debug output..."
	NODE_ENV=production DEBUG=* pnpm start:backend:prod

# Build & Test
build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck

clean:
	pnpm clean

clean-all:
	pnpm clean:all

fresh:
	pnpm fresh

# Docker
docker-up:
	docker-compose up -d
	@echo "Services started. Backend: http://localhost:3000, Frontend: http://localhost:3001"
	@echo "MailHog: http://localhost:8025, MinIO: http://localhost:9001"

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v
	docker rmi beauty-salon-backend:latest 2>/dev/null || true

# Database
db-migrate:
	pnpm --filter @beauty-salon-backend/migration run generate
	pnpm --filter @beauty-salon-backend/migration run migrate

db-seed:
	pnpm --filter @beauty-salon-backend/migration run seed

db-reset:
	@echo "Resetting database..."
	pnpm run db:reset
	$(MAKE) db-migrate
	@echo "Database reset complete!"


# Utility targets
.env:
	cp .env.example .env
	@echo "Created .env file from .env.example"
	@echo "Please update the values in .env as needed"