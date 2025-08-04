# Essential Development Commands

## Quick Start
```bash
# Install dependencies
make install

# Start Docker services (PostgreSQL, MailHog, MinIO)
make docker-up

# Run database migrations
make db-migrate

# Seed database with sample data
make db-seed
```

## Development Workflow

### Backend Development
```bash
# Build backend (generates types, formats, builds)
make backend-build

# Start backend server (from built dist)
make backend-start

# Alternative: Watch mode for development
pnpm dev:backend
```

### Frontend Development
```bash
# Build frontend packages (required before dev)
make frontend-build

# Start frontend dev server with watch mode
make frontend-dev
```

### Type Generation (Critical for API-First)
```bash
# Generate all types (TypeSpec → OpenAPI → TypeScript)
pnpm generate

# Individual generation steps
pnpm generate:spec     # TypeSpec to OpenAPI
pnpm generate:api      # OpenAPI to frontend client
pnpm generate:backend  # OpenAPI to backend types
```

## Code Quality
```bash
# Run all CI checks locally (matches GitHub Actions)
make ci-check

# Individual checks
pnpm lint              # Run linter (Biome)
pnpm format           # Format code
pnpm format:fix       # Auto-fix formatting
pnpm format:check     # Check formatting (CI mode)
pnpm typecheck        # TypeScript type checking
pnpm knip            # Find unused code/dependencies
pnpm audit           # Security audit
```

## Testing
```bash
# Run all tests
pnpm test

# Backend tests with testcontainers
make test-backend

# Frontend tests
make test-frontend

# Integration tests
pnpm test:integration

# CI mode (optimized for speed)
make test-backend-ci
```

## Database Management
```bash
# Generate migration from schema changes
pnpm db:generate

# Run migrations
pnpm db:migrate

# Reset database (drop, create, migrate)
pnpm db:reset

# Seed with sample data
pnpm db:seed

# Pull schema from existing DB
make db-pull
```

## Build Commands
```bash
# Build everything
make build

# Environment-specific builds
make backend-build-test
make backend-build-stg
make backend-build-prod
make frontend-build-test
make frontend-build-stg
make frontend-build-prod
```

## Docker Operations
```bash
make docker-up       # Start all services
make docker-down     # Stop services
make docker-logs     # View logs
make docker-clean    # Clean volumes and images
make docker-build    # Build Docker images
```

## Cleanup
```bash
make clean          # Clean build artifacts
make clean-all      # Clean everything including node_modules
make fresh          # Complete reset and reinstall
```

## Service URLs (Development)
- Backend API: http://localhost:4010
- Frontend: http://localhost:3001
- MailHog: http://localhost:8025
- MinIO: http://localhost:9001
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3100 (admin/admin)

## Git Commands
```bash
git status          # Check current changes
git diff            # View uncommitted changes
git log --oneline   # View recent commits
```

## System Commands (Linux)
```bash
ls -la              # List files with details
cd <directory>      # Change directory
pwd                 # Current directory
grep -r "pattern"   # Search in files
find . -name "*.ts" # Find files by pattern
```

## Help
```bash
make help           # Show all available make commands
pnpm run --help     # Show pnpm scripts
```