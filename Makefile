.PHONY: help install dev dev-backend dev-frontend build test lint format typecheck clean \
        docker-up docker-down docker-build docker-logs docker-clean \
        db-migrate db-seed db-reset api-spec \
        prod-build prod-run

# Default target
help:
	@echo "Beauty Salon Reservation App - Available commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install        - Install all dependencies"
	@echo "  make dev           - Start all development servers"
	@echo "  make dev-backend   - Start backend development server only"
	@echo "  make dev-frontend  - Start frontend development server only"
	@echo ""
	@echo "Build & Test:"
	@echo "  make build         - Build all packages"
	@echo "  make test          - Run all tests"
	@echo "  make lint          - Run linter"
	@echo "  make format        - Format code"
	@echo "  make typecheck     - Run type checking"
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
	@echo "API:"
	@echo "  make api-spec      - Generate API specification from TypeSpec"
	@echo ""
	@echo "Production:"
	@echo "  make prod-build    - Build for production"
	@echo "  make prod-run      - Run production build"

# Development
install:
	pnpm install

dev:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	pnpm dev

dev-backend:
	docker-compose up -d postgres mailhog minio minio-init
	@echo "Waiting for services to be ready..."
	@sleep 5
	pnpm dev:backend

dev-frontend:
	pnpm dev:frontend

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
	rm -rf node_modules

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

# API
api-spec:
	pnpm --filter @beauty-salon/specs run compile

# Production
prod-build:
	NODE_ENV=production pnpm build

prod-run:
	docker build --target production -t beauty-salon:prod .
	docker run -p 3000:3000 --env-file .env.production beauty-salon:prod

# Utility targets
.env:
	cp .env.example .env
	@echo "Created .env file from .env.example"
	@echo "Please update the values in .env as needed"