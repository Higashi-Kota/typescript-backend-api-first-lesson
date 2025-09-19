# AI Agent Guidelines

This document describes the specialized AI agents available for the Beauty Salon Reservation System development.

## 🤖 Available Agents

### 1. Backend TypeScript Architect

**Specialization**: Backend development with TypeScript and Node.js

**Use Cases**:
- API endpoint implementation
- Business logic development
- Database integration
- Server architecture decisions
- Performance optimization

**Key Expertise**:
- TypeScript best practices
- Express.js API development
- Clean Architecture implementation
- Sum types and pattern matching
- Result-based error handling

See [.claude/agents/backend-typescript-architect.md](.claude/agents/backend-typescript-architect.md) for detailed guidelines.

### 2. Database Schema Architect

**Specialization**: Database design and optimization

**Use Cases**:
- Schema design and normalization
- Migration planning
- Query optimization
- Index strategy
- Data integrity constraints

**Key Expertise**:
- PostgreSQL optimization
- Drizzle ORM patterns
- Database normalization
- Performance tuning
- Migration strategies

See [.claude/agents/database-schema-architect.md](.claude/agents/database-schema-architect.md) for detailed guidelines.

### 3. TypeSpec API Architect

**Specialization**: API design using TypeSpec

**Use Cases**:
- API contract definition
- OpenAPI specification
- Request/response schemas
- Validation rules
- API versioning

**Key Expertise**:
- TypeSpec syntax and decorators
- OpenAPI 3.x specification
- REST API design patterns
- Schema validation
- API documentation

See [.claude/agents/typespec-api-architect.md](.claude/agents/typespec-api-architect.md) for detailed guidelines.

### 4. Salon Business Expert

**Specialization**: Beauty salon domain expertise

**Use Cases**:
- Business requirement analysis
- Feature specification
- Workflow design
- Customer experience optimization
- Industry best practices

**Key Expertise**:
- Salon operations
- Booking workflows
- Customer management
- Service scheduling
- Staff management

See [.claude/agents/salon-business-expert.md](.claude/agents/salon-business-expert.md) for detailed guidelines.

## 📋 Agent Selection Guidelines

### When to Use Each Agent

| Task Type | Recommended Agent |
|-----------|------------------|
| API endpoint implementation | Backend TypeScript Architect |
| Database schema design | Database Schema Architect |
| API contract definition | TypeSpec API Architect |
| Business logic implementation | Backend TypeScript Architect |
| Feature requirements | Salon Business Expert |
| Query optimization | Database Schema Architect |
| Type generation setup | TypeSpec API Architect |
| Customer workflow design | Salon Business Expert |

### Collaboration Patterns

**Feature Implementation Flow**:
1. **Salon Business Expert**: Define requirements and workflows
2. **TypeSpec API Architect**: Design API contracts
3. **Database Schema Architect**: Design data models
4. **Backend TypeScript Architect**: Implement business logic

**Performance Optimization Flow**:
1. **Database Schema Architect**: Analyze query performance
2. **Backend TypeScript Architect**: Optimize application code
3. **TypeSpec API Architect**: Adjust API contracts if needed

## 🎯 Common Tasks

### Creating a New Feature
```
1. Consult Salon Business Expert for requirements
2. Use TypeSpec API Architect to define API
3. Use Database Schema Architect for schema changes
4. Use Backend TypeScript Architect for implementation
```

### Optimizing Performance
```
1. Use Database Schema Architect for query analysis
2. Use Backend TypeScript Architect for code optimization
3. Review with TypeSpec API Architect for API adjustments
```

### Debugging Issues
```
1. Use Backend TypeScript Architect for code issues
2. Use Database Schema Architect for data issues
3. Use Salon Business Expert for business logic validation
```

## 🔧 Agent Configuration

All agents follow these core principles:
- **Type Safety**: Strict TypeScript with no `any` types
- **Sum Types**: Use discriminated unions for state
- **Pattern Matching**: Exhaustive handling with ts-pattern
- **Result Types**: No exceptions, use Result for errors
- **Clean Architecture**: Separation of concerns
- **YAGNI**: No code "for the future"

## 📚 Agent Documentation

Detailed documentation for each agent is available in:
- [Backend TypeScript Architect](.claude/agents/backend-typescript-architect.md)
- [Database Schema Architect](.claude/agents/database-schema-architect.md)
- [TypeSpec API Architect](.claude/agents/typespec-api-architect.md)
- [Salon Business Expert](.claude/agents/salon-business-expert.md)

## ⚡ Quick Reference

### Backend Development
```bash
# Use Backend TypeScript Architect for:
- Implementing use cases
- Creating repositories
- Building API routes
- Writing mappers
```

### Database Design
```bash
# Use Database Schema Architect for:
- Creating tables
- Defining relationships
- Writing migrations
- Optimizing queries
```

### API Design
```bash
# Use TypeSpec API Architect for:
- Defining models
- Creating operations
- Setting validation rules
- Generating types
```

### Business Logic
```bash
# Use Salon Business Expert for:
- Understanding workflows
- Defining requirements
- Validating features
- Industry best practices
```