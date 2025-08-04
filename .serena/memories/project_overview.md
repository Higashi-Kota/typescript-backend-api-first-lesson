# TypeScript Backend API-First Lesson Project

## Project Purpose
A comprehensive beauty salon reservation system built with TypeScript, following API-First development principles with TypeSpec/OpenAPI. The system demonstrates clean architecture, type safety, and modern backend development practices.

## Key Features
- Beauty salon management (salons, staff, services)
- Customer management and loyalty program
- Reservation and booking system
- Review and rating system
- Authentication with 2FA, password reset, email verification
- Role-based access control
- File upload (MinIO/S3 compatible)
- Email notifications (MailHog for dev, Mailgun for prod)
- Monitoring (Prometheus, Grafana, Sentry)

## Technology Stack
- **Runtime**: Node.js 24+, TypeScript 5.8+
- **Package Manager**: pnpm with workspaces
- **API Framework**: Express with TypeSpec/OpenAPI
- **Database**: PostgreSQL 15+ with Drizzle ORM
- **Validation**: Zod
- **Pattern Matching**: ts-pattern
- **Testing**: Vitest with testcontainers
- **Code Quality**: Biome (linting/formatting), Knip (unused code)
- **Infrastructure**: Docker Compose
- **Monitoring**: Prometheus, Grafana, Sentry
- **Object Storage**: MinIO (S3-compatible)
- **Email**: MailHog (dev), Mailgun (prod)

## Architecture Principles
1. **API-First Development**: TypeSpec → OpenAPI → TypeScript types
2. **Clean Architecture**: Separation of concerns (Domain/UseCase/Infrastructure/API)
3. **Type Safety**: Sum types, ts-pattern, Result types for error handling
4. **Exception-Free**: No thrown exceptions, all errors handled via Result type
5. **Test-Driven**: Unit, integration, and E2E tests with testcontainers
6. **Security-First**: OWASP compliance, rate limiting, encryption

## Development Approach
- Strict TypeScript configuration with all safety checks enabled
- Sum types (discriminated unions) for state management
- Pattern matching for exhaustive case handling
- Brand types for type-safe IDs
- No `any` types, no type assertions
- AAA (Arrange-Act-Assert) testing pattern
- YAGNI principle - no unused code