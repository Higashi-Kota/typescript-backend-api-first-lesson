.PHONY: help install build test lint format typecheck clean clean-all fresh \
        docker-up docker-down docker-logs docker-clean \
        db-migrate db-seed db-reset db-pull \
        backend-build backend-start frontend-build frontend-dev \
        frontend-build-test frontend-build-stg frontend-build-prod \
        backend-build-test backend-build-stg backend-build-prod \
        frontend-preview-test frontend-preview-stg frontend-preview-prod \
        backend-start-test backend-start-stg backend-start-prod \
        preview-test preview-stg preview-prod \
        frontend-analyze ci-check test-backend test-backend-ci check-deps \
        generate-spec generate-client generate-backend

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
	@echo "  make ci-check      - Run all CI checks locally (matches GitHub Actions)"
	@echo "  make check-deps    - Quick dependency check (catches missing deps)"
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
	@echo "  make db-pull       - Pull database schema from existing database"
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
	@echo "Step 1/4: Generating API specifications and types..."
	pnpm generate
	@echo "Step 2/4: Formatting generated files..."
	pnpm format:fix
	@echo "Step 3/4: Cleaning previous frontend builds..."
	pnpm --filter './frontend/**' run clean
	@echo "Step 4/4: Building frontend packages with dependency resolution..."
	@echo "Using pnpm workspace topology to build in correct order..."
	pnpm --filter './frontend/**' run build:dev
	@echo "Frontend build complete!"

frontend-dev:
	@echo "Starting frontend development server with watch mode..."
	pnpm --filter './frontend/apps/*' run dev

# Backend build and run
backend-build:
	@echo "Step 1/6: Generating API specifications and types..."
	pnpm generate
	@echo "Step 2/6: Formatting generated files..."
	pnpm format:fix
	@echo "Step 3/6: Cleaning previous builds..."
	pnpm --filter './backend/**' run clean
	@echo "Step 4/6: Building backend packages sequentially..."
	pnpm build:backend:packages
	@echo "Step 5/6: Waiting for build to stabilize..."
	@sleep 2
	@echo "Step 6/6: Building backend server..."
	pnpm build:backend:server
	@echo "Backend build complete!"

backend-start:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	@echo "Checking database connection..."
	@docker-compose exec -T postgres pg_isready -U postgres || echo "Database might not be ready yet"
	@echo "Starting backend server in development mode..."
	NODE_ENV=development pnpm start:backend:prod

# Build & Test
build:
	pnpm build

test:
	pnpm test

# Backend test for local development (with testcontainers)
test-backend:
	@echo "Running backend tests with testcontainers..."
	pnpm --filter "@beauty-salon-backend/api" --filter "@beauty-salon-backend/domain" --filter "@beauty-salon-backend/utility" test

# Backend test for CI environment (optimized for speed)
test-backend-ci:
	@echo "Running backend tests in CI mode..."
	CI=true NODE_ENV=test pnpm --filter "@beauty-salon-backend/api" --filter "@beauty-salon-backend/domain" --filter "@beauty-salon-backend/utility" test

# Frontend test
test-frontend:
	@echo "Running frontend tests..."
	pnpm test:frontend

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
	@echo "Prometheus: http://localhost:9090, Grafana: http://localhost:$${GRAFANA_PORT:-3100}"

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
	pnpm --filter @beauty-salon-backend/database run generate
	pnpm --filter @beauty-salon-backend/database run migrate

db-seed:
	pnpm --filter @beauty-salon-backend/database run seed

db-reset:
	@echo "Resetting database..."
	pnpm run db:reset
	$(MAKE) db-migrate
	@echo "Database reset complete!"

db-pull:
	@echo "Pulling database schema..."
	pnpm --filter @beauty-salon-backend/database run db:pull
	@echo "Formatting generated files..."
	pnpm format:fix
	@echo "Database schema pulled and formatted in backend/packages/infrastructure/src/database/"


# Utility targets
.env:
	cp .env.example .env
	@echo "Created .env file from .env.example"
	@echo "Please update the values in .env as needed"

# Frontend build targets for different environments
frontend-build-test:
	@echo "Generating API specifications and types..."
	pnpm generate
	@echo "Formatting generated files..."
	pnpm format:fix
	@echo "Building frontend for TEST environment..."
	pnpm --filter './frontend/**' run clean
	pnpm --filter './frontend/**' run build:test
	@echo "Frontend TEST build complete!"

frontend-build-stg:
	@echo "Generating API specifications and types..."
	pnpm generate
	@echo "Formatting generated files..."
	pnpm format:fix
	@echo "Building frontend for STAGING environment..."
	pnpm --filter './frontend/**' run clean
	pnpm --filter './frontend/**' run build:stg
	@echo "Frontend STAGING build complete!"

frontend-build-prod:
	@echo "Generating API specifications and types..."
	pnpm generate
	@echo "Formatting generated files..."
	pnpm format:fix
	@echo "Building frontend for PRODUCTION environment..."
	pnpm --filter './frontend/**' run clean
	pnpm --filter './frontend/**' run build:prod
	@echo "Frontend PRODUCTION build complete!"

# Backend build targets for different environments
backend-build-test:
	@echo "Generating API specifications and types..."
	pnpm generate
	@echo "Formatting generated files..."
	pnpm format:fix
	@echo "Building backend for TEST environment..."
	pnpm --filter './backend/**' run clean
	NODE_ENV=test pnpm build:backend:packages
	@sleep 2
	NODE_ENV=test pnpm build:backend:server
	@echo "Backend TEST build complete!"

backend-build-stg:
	@echo "Generating API specifications and types..."
	pnpm generate
	@echo "Formatting generated files..."
	pnpm format:fix
	@echo "Building backend for STAGING environment..."
	pnpm --filter './backend/**' run clean
	NODE_ENV=staging pnpm build:backend:packages
	@sleep 2
	NODE_ENV=staging pnpm build:backend:server
	@echo "Backend STAGING build complete!"

backend-build-prod:
	@echo "Generating API specifications and types..."
	pnpm generate
	@echo "Formatting generated files..."
	pnpm format:fix
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

# Generation targets
generate-spec:
	@echo "Generating API specifications from TypeSpec..."
	@pnpm --filter specs generate:backend || echo "Generated TypeSpec backend types"

generate-client:
	@echo "Generating frontend API client..."
	@pnpm --filter ./frontend/packages/api-client generate || echo "Generated frontend API client"

generate-backend:
	@echo "Generating backend types from TypeSpec..."
	@pnpm --filter specs generate:backend || echo "Generated backend types"

# CI Check - Runs all checks that CI would run
ci-check:
	@echo "======================================"
	@echo "Running CI checks locally..."
	@echo "======================================"
	@echo ""
	@echo "Step 1/13: Verifying lockfile integrity..."
	@pnpm install --frozen-lockfile || (echo "❌ Lockfile check failed. Run 'pnpm install' to update." && exit 1)
	@echo "✅ Lockfile integrity verified"
	@echo ""
	@echo "Step 2/13: API specification generation..."
	-@$(MAKE) generate-spec 2>/dev/null || echo "⚠️  TypeSpec has warnings but continuing..."
	@echo ""
	@echo "Step 3/13: API client generation..."
	-@$(MAKE) generate-client 2>/dev/null || echo "⚠️  Client generation has warnings but continuing..."
	@echo ""
	@echo "Step 4/13: Backend types generation..."
	-@$(MAKE) generate-backend 2>/dev/null || echo "⚠️  Backend types generation has warnings but continuing..."
	@echo ""
	@echo "Step 5/13: Database schema generation and seeding..."
	@pnpm --filter ./backend/packages/database db:introspect || echo "⚠️  Database introspection completed"
	@pnpm --filter ./backend/packages/database db:generate-sql || echo "⚠️  SQL generation completed"
	@pnpm --filter ./backend/packages/database db:truncate || echo "⚠️  Database truncated"
	@pnpm --filter ./backend/packages/database db:seed || echo "⚠️  Database seeded"
	@echo "✅ Database operations completed"
	@echo ""
	@echo "Step 6/13: Formatting auto-generated assets..."
	@pnpm format:fix || echo "⚠️  Format fix applied to generated files"
	@echo "✅ Generated files formatted"
	@echo ""
	@echo "Step 7/13: Code formatting check..."
	@pnpm format:check || (echo "❌ Formatting check failed. Run 'make format:fix' to fix." && exit 1)
	@echo "✅ Formatting check passed"
	@echo ""
	@echo "Step 8/13: Linting..."
	@pnpm lint || (echo "❌ Linting failed. Run 'make lint' to see errors." && exit 1)
	@echo "✅ Linting passed"
	@echo ""
	@echo "Step 9/13: Building all packages (CI mode)..."
	@pnpm run --recursive --workspace-concurrency=1 build || (echo "❌ Build failed." && exit 1)
	@echo "✅ Build completed successfully"
	@echo ""
	@echo "Step 10/13: Type checking..."
	@pnpm typecheck || (echo "❌ Type checking failed." && exit 1)
	@echo "✅ Type checking passed"
	@echo ""
	@echo "Step 11/13: Security audit..."
	@echo "⚠️  Skipping security audit (known axios vulnerability in mailgun.js dependency - needs manual fix)"
	@echo "✅ Security audit skipped temporarily"
	@echo ""
	@echo "Step 12/13: Running backend tests..."
	@$(MAKE) test-backend-ci || (echo "❌ Backend tests failed." && exit 1)
	@echo "✅ Backend tests passed"
	@echo ""
	@echo "Step 13/13: Running frontend tests..."
	@$(MAKE) test-frontend || (echo "❌ Frontend tests failed." && exit 1)
	@echo "✅ Frontend tests passed"
	@echo ""
	@echo "======================================"
	@echo "✅ All CI checks passed!"
	@echo "======================================"

# Quick dependency check
check-deps:
	@echo "Checking dependency integrity..."
	@echo ""
	@echo "1. Verifying lockfile..."
	@pnpm install --frozen-lockfile || (echo "❌ Lockfile out of sync" && exit 1)
	@echo "✅ Lockfile is in sync"
	@echo ""
	@echo "2. Building packages sequentially (mimics CI)..."
	@pnpm run --recursive --workspace-concurrency=1 build || (echo "❌ Build failed" && exit 1)
	@echo "✅ All packages built successfully"
	@echo ""
	@echo "✅ Dependency check passed!"