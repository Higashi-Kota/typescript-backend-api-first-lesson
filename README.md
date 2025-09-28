# Beauty Salon Reservation System

A modern, type-safe beauty salon reservation system built with TypeScript, TypeSpec API-First development, and Clean Architecture principles.

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Testing](#-testing)
- [Documentation](#-documentation)

## 🏗️ Architecture

This project follows Clean Architecture principles with API-First development using TypeSpec for type generation.

### Core Principles

1. **API-First Development**: TypeSpec → OpenAPI → TypeScript types
2. **Clean Architecture**: Business logic isolated from infrastructure
3. **Type Safety**: Sum types and exhaustive pattern matching with ts-pattern
4. **Exception-Free**: Result types for error handling
5. **Testability**: Integration testing with testcontainers

### System Layers

```
┌─────────────────────────────────────────┐
│           API Layer (Express)           │ ← HTTP handlers, routing
├─────────────────────────────────────────┤
│      Use Case Layer (Business Logic)    │ ← Orchestration, workflows
├─────────────────────────────────────────┤
│        Domain Layer (Pure Logic)        │ ← Business rules, entities
├─────────────────────────────────────────┤
│   Infrastructure Layer (External I/O)   │ ← Database, email, storage
└─────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/architecture-overview.md](docs/architecture-overview.md).

## 🚀 Quick Start

### Prerequisites

- Node.js 24+
- pnpm 10+
- Docker (for local PostgreSQL)
- PostgreSQL 15

### Installation

```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:fresh

# Generate types from TypeSpec
pnpm generate

# Start development server
pnpm dev
```

## 📁 Project Structure

```
.
├── specs/                      # TypeSpec API definitions
│   ├── models/                # Data model definitions
│   └── operations/            # API operation definitions
│
├── backend/                    # Backend monorepo
│   ├── packages/
│   │   ├── domain/           # Business logic layer
│   │   ├── infrastructure/  # External services
│   │   ├── api/              # HTTP layer
│   │   ├── database/         # Database schemas
│   │   ├── generated/        # Auto-generated types
│   │   └── config/           # Configuration
│   └── apps/
│       └── server/           # Express application
│
├── frontend/                   # Frontend applications
│   ├── packages/             # Shared frontend packages
│   └── apps/                 # Frontend applications
│
└── docs/                      # Documentation
```

## 🛠️ Development

### Type Generation Pipeline

1. Define API contracts in TypeSpec (`specs/`)
2. Generate OpenAPI specification: `pnpm generate:spec`
3. Generate TypeScript types: `pnpm generate:backend`

### Available Scripts

```bash
# Development
pnpm dev                 # Start all development servers
pnpm dev:backend        # Start backend only
pnpm dev:frontend       # Start frontend only

# Building
pnpm build              # Build all packages
pnpm build:prod         # Production build

# Testing
pnpm test               # Run unit tests
pnpm test:integration   # Run integration tests
pnpm test:e2e          # Run end-to-end tests

# Code Quality
pnpm lint               # Lint code
pnpm typecheck          # TypeScript type checking
pnpm format:fix         # Auto-format code

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed           # Seed database
pnpm db:fresh          # Complete reset with schema and seed
pnpm db:truncate       # Clear all table data
pnpm db:introspect     # Generate TypeScript schema from DB
```

## 🧪 Testing

The project uses a comprehensive testing strategy:

- **Unit Tests**: Domain logic and pure functions (Vitest)
- **Integration Tests**: Repository and service layers (testcontainers)
- **E2E Tests**: Complete API flows

See [docs/testing-requirements.md](docs/testing-requirements.md) for testing guidelines.

## 📚 Documentation

### Core Documentation

- [Architecture Overview](docs/architecture-overview.md) - System design and architecture
- [Development Guidelines](CLAUDE.md) - Coding standards and best practices
- [API Documentation](docs/api-testing-guide.md) - API testing and development

### Development Guides

- [TypeScript Configuration](docs/typescript-configuration.md)
- [Type Safety Principles](docs/type-safety-principles.md)
- [Sum Types & Pattern Matching](docs/sum-types-pattern-matching.md)
- [Backend Architecture](docs/backend-architecture-guidelines.md)
- [Multi-Agent Collaboration](docs/multi-agent-collaboration-framework.md) - AI agent design validation protocol

### Implementation Guides

- [Domain Implementation Reference](docs/domain-implementation-reference.md) - Complete reference for implementing new domains
- [API Route Modular Structure](docs/api-route-modular-structure.md) - Guide for modular route organization
- [Uniform Implementation](docs/uniform-implementation-guide.md)
- [Testing Requirements](docs/testing-requirements.md)
- [Type Generation System](docs/type-generation-system.md)

## 🔑 Key Technologies

### Backend
- **TypeScript** - Type-safe JavaScript
- **TypeSpec** - API-first type generation
- **Express** - Web framework
- **Drizzle ORM** - Type-safe database access
- **PostgreSQL** - Relational database
- **ts-pattern** - Pattern matching
- **Zod** - Runtime validation
- **testcontainers** - Integration testing

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **TanStack Query** - Data fetching
