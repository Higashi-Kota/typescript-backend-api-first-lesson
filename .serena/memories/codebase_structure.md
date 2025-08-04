# Codebase Structure

## Root Directory
```
/home/aine/higashi-wrksp/typescript-backend-api-first-lesson/
├── specs/                    # TypeSpec API definitions (source of truth)
├── backend/                  # Backend monorepo
├── frontend/                 # Frontend monorepo  
├── docs/                     # Project documentation
├── shared-config/            # Shared TypeScript configs
├── .github/                  # GitHub Actions workflows
├── docker-compose.yml        # Local development services
├── Makefile                  # Development commands
├── CLAUDE.md                # AI assistant guidelines
└── package.json             # Root workspace config
```

## Backend Structure (`backend/`)
```
backend/
├── packages/                 # Shared packages (layered architecture)
│   ├── domain/              # Core business logic (pure functions)
│   │   ├── models/          # Sum type domain models
│   │   ├── repositories/    # Repository interfaces
│   │   └── shared/          # Result types, Brand types
│   │
│   ├── usecase/             # Application logic
│   │   └── [entity]/        # Use cases per entity
│   │
│   ├── infrastructure/      # External integrations
│   │   ├── database/        # Drizzle ORM schemas
│   │   ├── repositories/    # Repository implementations
│   │   ├── email/           # Email service
│   │   └── storage/         # File storage (MinIO)
│   │
│   ├── api/                 # HTTP layer
│   │   ├── routes/          # Express routes
│   │   ├── middleware/      # Auth, rate limit, etc.
│   │   └── handlers/        # Request handlers
│   │
│   ├── types/               # Generated TypeScript types
│   │   ├── scripts/         # Type generation scripts
│   │   └── src/generated/   # Auto-generated from OpenAPI
│   │
│   ├── config/              # Configuration management
│   ├── database/            # Database utilities
│   ├── mappers/             # Type mappers (API ↔ Domain)
│   └── test-utils/          # Testing utilities
│
└── apps/
    ├── server/              # Express API server
    └── migration/           # Database migrations
        ├── scripts/         # Migration SQL files
        └── src/             # Migration runners
```

## Frontend Structure (`frontend/`)
```
frontend/
├── packages/
│   ├── api-client/          # Generated API client
│   ├── ui/                  # Shared UI components
│   └── utils/               # Shared utilities
│
└── apps/
    ├── portal-app/          # Customer portal
    ├── admin-app/           # Admin dashboard
    └── dashboard-app/       # Analytics dashboard
```

## API Definition (`specs/`)
```
specs/
├── main.tsp                 # Entry point
├── models/                  # Data models
│   ├── customer.tsp
│   ├── salon.tsp
│   ├── staff.tsp
│   ├── service.tsp
│   ├── reservation.tsp
│   ├── booking.tsp
│   └── review.tsp
└── operations/              # API operations
    ├── customer-operations.tsp
    ├── salon-operations.tsp
    └── ...
```

## Key Architectural Layers

### 1. Domain Layer (`domain/`)
- Pure business logic
- No external dependencies
- Sum types for state
- Result types for errors
- Brand types for IDs

### 2. Use Case Layer (`usecase/`)
- Application workflows
- Orchestrates domain logic
- Dependency injection
- Returns Result types

### 3. Infrastructure Layer (`infrastructure/`)
- Database access (Drizzle)
- External services (email, storage)
- Repository implementations
- Third-party integrations

### 4. API Layer (`api/`)
- HTTP routing (Express)
- Request/response handling
- Authentication/authorization
- Error formatting
- Rate limiting

## Data Flow
```
TypeSpec → OpenAPI → TypeScript Types
    ↓
Database ↔ Repository ↔ UseCase ↔ API ↔ Frontend
    ↑         ↑           ↑        ↑        ↑
DB Schema  Domain      Domain   Generated  Generated
           Interface    Models    Types     Client
```

## Testing Structure
```
[package]/
├── src/
│   ├── *.ts                # Source files
│   └── __tests__/          # Test files
│       └── *.test.ts
└── vitest.config.ts        # Test configuration
```

## Important Files
- `CLAUDE.md` - Development guidelines and principles
- `Makefile` - All development commands
- `.env.example` - Environment variables template
- `docker-compose.yml` - Local services setup
- `pnpm-workspace.yaml` - Workspace configuration
- `biome.json` - Linting and formatting rules
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test runner config

## Package Naming Convention
- Backend: `@beauty-salon-backend/*`
- Frontend: `@beauty-salon-frontend/*`  
- Shared: `@beauty-salon-shared/*`
- Specs: `@beauty-salon/specs`