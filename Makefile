.PHONY: help install build test lint format typecheck clean clean-all fresh \
        docker-up docker-down docker-logs docker-clean \
        db-migrate db-seed db-reset \
        backend-build backend-start frontend-build frontend-dev \
        frontend-build-test frontend-build-stg frontend-build-prod \
        backend-build-test backend-build-stg backend-build-prod \
        frontend-preview-test frontend-preview-stg frontend-preview-prod \
        backend-start-test backend-start-stg backend-start-prod \
        preview-test preview-stg preview-prod \
        frontend-analyze

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
	@echo "  make frontend-build - Build frontend (required before dev)"
	@echo "  make frontend-dev   - Start frontend dev server with watch mode"
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
	@echo "Release (Test/Staging/Production):"
	@echo "  make frontend-build-test/stg/prod  - Build frontend for specific environment"
	@echo "  make backend-build-test/stg/prod   - Build backend for specific environment"
	@echo "  make frontend-preview-test/stg/prod - Preview frontend builds"
	@echo "  make backend-start-test/stg/prod   - Start backend for specific environment"
	@echo "  make preview-test/stg/prod         - Start full stack preview"
	@echo "  make frontend-analyze              - Analyze bundle sizes"
	@echo ""

# Installation
install:
	pnpm install

# Frontend Development
frontend-build:
	@echo "Cleaning previous frontend builds..."
	pnpm --filter './frontend/**' run clean
	@echo "Building frontend packages with dependency resolution..."
	@echo "Using pnpm workspace topology to build in correct order..."
	pnpm --filter './frontend/**' run build:dev
	@echo "Frontend build complete!"

frontend-dev:
	@echo "Starting frontend development server with watch mode..."
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

# Frontend build targets for different environments
frontend-build-test:
	@echo "Building frontend for TEST environment..."
	pnpm --filter './frontend/**' run clean
	pnpm --filter './frontend/**' run build:test
	@echo "Frontend TEST build complete!"

frontend-build-stg:
	@echo "Building frontend for STAGING environment..."
	pnpm --filter './frontend/**' run clean
	pnpm --filter './frontend/**' run build:stg
	@echo "Frontend STAGING build complete!"

frontend-build-prod:
	@echo "Building frontend for PRODUCTION environment..."
	pnpm --filter './frontend/**' run clean
	pnpm --filter './frontend/**' run build:prod
	@echo "Frontend PRODUCTION build complete!"

# Backend build targets for different environments
backend-build-test:
	@echo "Building backend for TEST environment..."
	pnpm --filter './backend/**' run clean
	NODE_ENV=test pnpm build:backend:packages
	@sleep 2
	NODE_ENV=test pnpm build:backend:server
	@echo "Backend TEST build complete!"

backend-build-stg:
	@echo "Building backend for STAGING environment..."
	pnpm --filter './backend/**' run clean
	NODE_ENV=staging pnpm build:backend:packages
	@sleep 2
	NODE_ENV=staging pnpm build:backend:server
	@echo "Backend STAGING build complete!"

backend-build-prod:
	@echo "Building backend for PRODUCTION environment..."
	pnpm --filter './backend/**' run clean
	NODE_ENV=production pnpm build:backend:packages
	@sleep 2
	NODE_ENV=production pnpm build:backend:server
	@echo "Backend PRODUCTION build complete!"

# Frontend preview targets
frontend-preview-test:
	@echo "Starting frontend preview servers for TEST environment..."
	@echo "Portal: http://localhost:4001"
	@echo "Admin: http://localhost:4002"
	@echo "Dashboard: http://localhost:4003"
	@pnpm --filter '@beauty-salon-frontend/portal-app' run preview --port 4001 &
	@pnpm --filter '@beauty-salon-frontend/admin-app' run preview --port 4002 &
	@pnpm --filter '@beauty-salon-frontend/dashboard-app' run preview --port 4003

frontend-preview-stg:
	@echo "Starting frontend preview servers for STAGING environment..."
	@echo "Portal: http://localhost:5001"
	@echo "Admin: http://localhost:5002"
	@echo "Dashboard: http://localhost:5003"
	@pnpm --filter '@beauty-salon-frontend/portal-app' run preview --port 5001 &
	@pnpm --filter '@beauty-salon-frontend/admin-app' run preview --port 5002 &
	@pnpm --filter '@beauty-salon-frontend/dashboard-app' run preview --port 5003

frontend-preview-prod:
	@echo "Starting frontend preview servers for PRODUCTION environment..."
	@echo "Portal: http://localhost:8001"
	@echo "Admin: http://localhost:8002"
	@echo "Dashboard: http://localhost:8003"
	@pnpm --filter '@beauty-salon-frontend/portal-app' run preview --port 8001 &
	@pnpm --filter '@beauty-salon-frontend/admin-app' run preview --port 8002 &
	@pnpm --filter '@beauty-salon-frontend/dashboard-app' run preview --port 8003

# Individual app preview targets
frontend-preview-test-portal:
	@pnpm --filter '@beauty-salon-frontend/portal-app' run preview --port 4001

frontend-preview-test-admin:
	@pnpm --filter '@beauty-salon-frontend/admin-app' run preview --port 4002

frontend-preview-test-dashboard:
	@pnpm --filter '@beauty-salon-frontend/dashboard-app' run preview --port 4003

frontend-preview-stg-portal:
	@pnpm --filter '@beauty-salon-frontend/portal-app' run preview --port 5001

frontend-preview-stg-admin:
	@pnpm --filter '@beauty-salon-frontend/admin-app' run preview --port 5002

frontend-preview-stg-dashboard:
	@pnpm --filter '@beauty-salon-frontend/dashboard-app' run preview --port 5003

frontend-preview-prod-portal:
	@pnpm --filter '@beauty-salon-frontend/portal-app' run preview --port 8001

frontend-preview-prod-admin:
	@pnpm --filter '@beauty-salon-frontend/admin-app' run preview --port 8002

frontend-preview-prod-dashboard:
	@pnpm --filter '@beauty-salon-frontend/dashboard-app' run preview --port 8003

# Backend start targets for different environments
backend-start-test:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Starting backend server in TEST mode..."
	NODE_ENV=test pnpm start:backend:prod

backend-start-stg:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Starting backend server in STAGING mode..."
	NODE_ENV=staging pnpm start:backend:prod

backend-start-prod:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Starting backend server in PRODUCTION mode..."
	NODE_ENV=production pnpm start:backend:prod

# Full stack preview targets
preview-test: backend-start-test frontend-preview-test

preview-stg: backend-start-stg frontend-preview-stg

preview-prod: backend-start-prod frontend-preview-prod

# Bundle analysis
frontend-analyze:
	@echo "Analyzing frontend bundle sizes..."
	pnpm --filter './frontend/apps/*' run build:analyze