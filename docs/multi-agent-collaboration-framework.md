# Agent-to-Agent Design Validation Protocol

## 概要

設計フェーズにおいて、実装前に型・定義の不整合を防ぐためのエージェント間自律検証プロトコルです。各エージェントは設計成果物（Design Artifact）を生成し、[Design Review Architect](../.claude/agents/design-review-architect.md)が中心となって型同期を検証します。

本プロトコルは[CLAUDE.md](../CLAUDE.md)で定義された開発原則および[アーキテクチャ概要](./architecture-overview.md)に準拠しています。

## 🏗️ アーキテクチャ前提

### DB駆動型定義の原則

[DB-Driven Domain Model](./db-driven-domain-model.md)アーキテクチャに基づく型定義フロー：

```
Database Schema (Single Source of Truth)
    ↓ [Type Inference]
Domain Model
    ↓ [Mapper]
API Types (TypeSpec/OpenAPI)
    ↓ [Code Generation]
Frontend Types
```

- **DBスキーマが型定義の源**: Drizzle ORMの型推論（`$inferSelect`, `$inferInsert`）から全てが始まる（[Backend Architecture Guidelines](./backend-architecture-guidelines.md)参照）
- **TypeSpecは契約定義**: APIの入出力契約を定義し、DBスキーマとの整合性が必須（[TypeSpec API Type Rules](./typespec-api-type-rules.md)参照）
- **型変換は明示的**: 各レイヤー間の型変換はマッパーで明示的に定義（[API-DB Type Constraints Mapping](./api-db-type-constraints-mapping.md)参照）

## 📦 Design Artifact仕様

各エージェントが生成する設計成果物の形式を定義します。これらは相互検証のための共通インターフェースです。

### Database Schema Artifact

[Database Schema Architect](../.claude/agents/database-schema-architect.md)が生成する成果物：

```typescript
interface DatabaseSchemaArtifact {
  tables: {
    [tableName: string]: {
      columns: {
        [columnName: string]: {
          type: "uuid" | "text" | "integer" | "timestamp" | "boolean" | "jsonb"
          nullable: boolean
          unique?: boolean
          references?: { table: string; column: string }
        }
      }
      enums?: {
        [enumName: string]: string[]  // snake_case values
      }
    }
  }
  inferredTypes: {
    select: Record<string, TypeDefinition>  // $inferSelect結果
    insert: Record<string, TypeDefinition>  // $inferInsert結果
  }
}
```

### TypeSpec API Artifact

[TypeSpec API Architect](../.claude/agents/typespec-api-architect.md)が生成する成果物：

```typescript
interface TypeSpecAPIArtifact {
  models: {
    [modelName: string]: {
      properties: {
        [propertyName: string]: {
          type: string
          required: boolean
          nullable: boolean
          enum?: string[]  // camelCase values
        }
      }
    }
  }
  operations: {
    [operationId: string]: {
      request?: string  // Model name
      response: string  // Model name
    }
  }
}
```

### Frontend Type Artifact

[Senior Frontend Architect](../.claude/agents/senior-frontend-architect.md)が生成する成果物：

```typescript
interface FrontendTypeArtifact {
  interfaces: {
    [interfaceName: string]: {
      fields: {
        [fieldName: string]: {
          type: string
          optional: boolean
          nullable: boolean
        }
      }
    }
  }
  apiBindings: {
    [operationId: string]: {
      request?: string  // Interface name
      response: string  // Interface name
    }
  }
}
```

### Mapper Definition Artifact

[Backend TypeScript Architect](../.claude/agents/backend-typescript-architect.md)が生成する成果物：

```typescript
interface MapperArtifact {
  readMappers: {
    [mapperName: string]: {
      source: string  // DB type
      target: string  // API type
      fieldMappings: Array<{
        from: string  // snake_case
        to: string    // camelCase
        transform?: "direct" | "computed" | "lookup"
      }>
    }
  }
  writeMappers: {
    [mapperName: string]: {
      source: string  // API type
      target: string  // DB type
      validations: string[]
      fieldMappings: Array<{
        from: string  // camelCase
        to: string    // snake_case
        required: boolean
      }>
    }
  }
}
```

## 🔄 Agent Interaction Protocol

### Phase 1: Initial Design Generation
```
[Salon Business Expert](../.claude/agents/salon-business-expert.md)
    ↓ [Business Requirements]
[Database Schema Architect](../.claude/agents/database-schema-architect.md) + [TypeSpec API Architect](../.claude/agents/typespec-api-architect.md) (並行)
    ↓ [Initial Artifacts]
[Design Review Architect](../.claude/agents/design-review-architect.md)
    ↓ [Validation Request]
```

### Phase 2: Cross-Validation Loop
```
[Design Review Architect](../.claude/agents/design-review-architect.md)
    ↓ [Type Mismatch Detection]
    ├→ [Database Schema Architect](../.claude/agents/database-schema-architect.md) [Schema Adjustment Request]
    ├→ [TypeSpec API Architect](../.claude/agents/typespec-api-architect.md) [API Model Adjustment Request]
    └→ [Backend TypeScript Architect](../.claude/agents/backend-typescript-architect.md) [Mapper Design Request]
    ↓ [Updated Artifacts]
[Design Review Architect](../.claude/agents/design-review-architect.md)
    ↓ [Re-validation]
```

### Phase 3: Frontend Integration Validation
```
[Design Review Architect](../.claude/agents/design-review-architect.md)
    ↓ [API Contract Confirmation]
[Senior Frontend Architect](../.claude/agents/senior-frontend-architect.md)
    ↓ [Frontend Type Generation]
[Design Review Architect](../.claude/agents/design-review-architect.md)
    ↓ [End-to-End Validation]
```

[Senior UI Designer](../.claude/agents/senior-ui-designer.md)は、UIコンポーネントの設計においてフロントエンド型定義との整合性を確認します。

## 🔍 Validation Rules

### Level 1: Type Compatibility Matrix
```typescript
const typeCompatibility = {
  // DB Type → API Type
  "uuid": ["string"],
  "text": ["string"],
  "integer": ["number", "integer"],
  "timestamp": ["string", "DateTime"],
  "boolean": ["boolean"],
  "jsonb": ["object", "any"]
}
```

### Level 2: Enum Synchronization Rules

[TypeSpec API Type Rules](./typespec-api-type-rules.md)に準拠したEnum同期検証：

```typescript
interface EnumValidation {
  // DB enum (snake_case) must map to API enum (any case)
  validateEnum(dbEnum: string[], apiEnum: string[]): ValidationResult {
    const normalized = dbEnum.map(toSnakeCase)
    const apiNormalized = apiEnum.map(toSnakeCase)
    return {
      valid: normalized.every(v => apiNormalized.includes(v)),
      missing: normalized.filter(v => !apiNormalized.includes(v))
    }
  }
}
```

### Level 3: Field Mapping Rules
```typescript
interface FieldMappingValidation {
  rules: {
    // snake_case ↔ camelCase conversion is always valid
    namingConvention: (dbField: string, apiField: string) =>
      toSnakeCase(apiField) === dbField

    // Required in DB → Required in API (Create operations)
    requiredConsistency: (dbRequired: boolean, apiRequired: boolean) =>
      !dbRequired || apiRequired

    // Nullable in DB → Optional/Nullable in API
    nullableConsistency: (dbNullable: boolean, apiOptional: boolean) =>
      !dbNullable || apiOptional
  }
}
```

## 🚨 Validation Error Protocol

### Error Types
```typescript
enum ValidationErrorType {
  TYPE_MISMATCH = "TYPE_MISMATCH",           // 型の不一致
  ENUM_VALUE_MISSING = "ENUM_VALUE_MISSING", // Enum値の欠落
  FIELD_MISSING = "FIELD_MISSING",           // フィールドの欠落
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION", // 制約違反
  MAPPER_UNDEFINED = "MAPPER_UNDEFINED"      // マッパー未定義
}

interface ValidationError {
  type: ValidationErrorType
  severity: "ERROR" | "WARNING"
  source: string  // Agent name
  target: string  // Agent name
  details: {
    layer: "DB" | "API" | "Frontend"
    entity: string
    field?: string
    expected: any
    actual: any
  }
  suggestedFix: string
}
```

### Error Resolution Flow
```
Design Review Architect [Detects Error]
    ↓ [ValidationError]
Source Agent [Receives Error]
    ↓ [Analyzes Root Cause]
    ├→ [Can Fix] → Generate Updated Artifact → Re-validation
    └→ [Cannot Fix] → Escalation Protocol
```

### Escalation Protocol
```typescript
interface EscalationRequest {
  error: ValidationError
  attemptedFixes: string[]
  blockedBy: {
    reason: "BUSINESS_CONSTRAINT" | "TECHNICAL_LIMITATION" | "CONFLICTING_REQUIREMENTS"
    details: string
  }
  proposedResolution: {
    option1: { change: string; impact: string }
    option2: { change: string; impact: string }
  }
}
```

## 🎯 Validation Checkpoint Definitions

### Checkpoint 1: DB-API Type Alignment
```typescript
interface DBAPIAlignmentCheck {
  validate(): CheckResult {
    for (const table of dbArtifact.tables) {
      const apiModel = findCorrespondingModel(table)
      if (!apiModel) return { pass: false, error: "Missing API model" }

      for (const column of table.columns) {
        const apiProperty = findProperty(apiModel, column)
        if (!validateTypeMapping(column.type, apiProperty.type)) {
          return { pass: false, error: "Type mismatch" }
        }
      }
    }
    return { pass: true }
  }
}
```

### Checkpoint 2: Enum Value Consistency
```typescript
interface EnumConsistencyCheck {
  validate(): CheckResult {
    for (const [tableName, table] of Object.entries(dbArtifact.tables)) {
      if (!table.enums) continue

      for (const [enumName, dbValues] of Object.entries(table.enums)) {
        const apiEnum = findAPIEnum(enumName)
        const missing = dbValues.filter(v =>
          !apiEnum.values.map(normalize).includes(normalize(v))
        )
        if (missing.length > 0) {
          return { pass: false, missing }
        }
      }
    }
    return { pass: true }
  }
}
```

### Checkpoint 3: Mapper Completeness
```typescript
interface MapperCompletenessCheck {
  validate(): CheckResult {
    // Every DB entity needs a Read mapper
    for (const table of dbArtifact.tables) {
      if (!mapperArtifact.readMappers[table.name]) {
        return { pass: false, error: `Missing read mapper for ${table.name}` }
      }
    }

    // Every API Create/Update operation needs a Write mapper
    for (const operation of apiArtifact.operations) {
      if (operation.request && !mapperArtifact.writeMappers[operation.id]) {
        return { pass: false, error: `Missing write mapper for ${operation.id}` }
      }
    }

    return { pass: true }
  }
}
```

## 📊 Validation State Machine

```typescript
enum ValidationState {
  INITIAL = "INITIAL",
  DESIGNING = "DESIGNING",
  VALIDATING = "VALIDATING",
  ERROR_DETECTED = "ERROR_DETECTED",
  FIXING = "FIXING",
  VALIDATED = "VALIDATED",
  ESCALATED = "ESCALATED"
}

interface ValidationStateMachine {
  currentState: ValidationState
  artifacts: Map<string, any>
  errors: ValidationError[]

  transitions: {
    [ValidationState.INITIAL]: ValidationState.DESIGNING,
    [ValidationState.DESIGNING]: ValidationState.VALIDATING,
    [ValidationState.VALIDATING]: ValidationState.VALIDATED | ValidationState.ERROR_DETECTED,
    [ValidationState.ERROR_DETECTED]: ValidationState.FIXING | ValidationState.ESCALATED,
    [ValidationState.FIXING]: ValidationState.VALIDATING,
    [ValidationState.ESCALATED]: ValidationState.DESIGNING
  }
}
```

## 🔐 Invariants

設計プロセス全体で保証される不変条件（[CLAUDE.md](../CLAUDE.md)の型安全性要件に基づく）：

1. **DB型からの推論が常に可能**: すべてのドメインモデルはDBスキーマから型推論可能（[DB-Driven Domain Model](./db-driven-domain-model.md)）
2. **Enum値の完全性**: DBに存在するEnum値は必ずAPIにも存在（[TypeSpec Directory Structure](./typespec-directory-structure.md)）
3. **必須フィールドの保持**: DBで必須のフィールドはAPI Createでも必須（[TypeSpec API Type Rules](./typespec-api-type-rules.md)）
4. **マッパーの双方向性**: Read/Writeマッパーは逆変換可能（[API-DB Type Constraints Mapping](./api-db-type-constraints-mapping.md)）
5. **型変換の明示性**: 暗黙の型変換は禁止、すべてマッパーで明示（[Sum Types & Pattern Matching](./sum-types-pattern-matching.md)）

## 📋 Design Completion Criteria

設計が完了したと判定される条件：

```typescript
interface DesignCompletionCriteria {
  allArtifactsGenerated: boolean       // 全エージェントが成果物を生成
  typeAlignmentValidated: boolean      // DB-API-Frontend型が整合
  enumsSynchronized: boolean           // 全Enum値が同期
  mappersComplete: boolean              // 全エンティティにマッパー定義
  validationsPassed: boolean            // 全チェックポイント通過
  noBlockingErrors: boolean            // 解決不能エラーなし
}

const isDesignComplete = (criteria: DesignCompletionCriteria): boolean =>
  Object.values(criteria).every(Boolean)
```

## 🔄 Continuous Validation Loop

```typescript
class DesignValidationOrchestrator {
  async runValidation(): Promise<ValidationResult> {
    while (!isDesignComplete(this.criteria)) {
      // 1. Collect artifacts from all agents
      const artifacts = await this.collectArtifacts()

      // 2. Run validation checks
      const errors = await this.validateArtifacts(artifacts)

      if (errors.length === 0) {
        this.criteria.validationsPassed = true
        break
      }

      // 3. Dispatch errors to responsible agents
      for (const error of errors) {
        await this.dispatchError(error)
      }

      // 4. Wait for fixes
      await this.waitForFixes()

      // 5. Check for escalation
      if (this.hasEscalatedErrors()) {
        return { status: "ESCALATED", errors: this.escalatedErrors }
      }
    }

    return { status: "VALIDATED", artifacts: this.finalArtifacts }
  }
}
```

## 📚 参照

### 開発原則・ガイドライン
- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体の開発ガイドライン
- [README.md](../README.md) - システム概要とクイックスタート
- [AGENTS.md](../AGENTS.md) - エージェント利用ガイド

### アーキテクチャドキュメント
- [Architecture Overview](./architecture-overview.md) - システムアーキテクチャ概要
- [Backend Architecture Guidelines](./backend-architecture-guidelines.md) - バックエンドアーキテクチャガイドライン
- [DB-Driven Domain Model](./db-driven-domain-model.md) - DB駆動ドメインモデルアーキテクチャ

### 型定義・同期ルール
- [TypeSpec API Type Rules](./typespec-api-type-rules.md) - TypeSpec API型定義ルール
- [API-DB Type Constraints Mapping](./api-db-type-constraints-mapping.md) - API-DB型制約マッピング機構
- [TypeSpec Directory Structure](./typespec-directory-structure.md) - TypeSpecディレクトリ構造
- [Type Safety Principles](./type-safety-principles.md) - 型安全性の原則
- [Sum Types & Pattern Matching](./sum-types-pattern-matching.md) - Sum型とパターンマッチング

### 実装ガイド
- [Uniform Implementation Guide](./uniform-implementation-guide.md) - 統一実装ガイド
- [Type Generation System](./type-generation-system.md) - 型生成システム
- [TypeScript Configuration](./typescript-configuration.md) - TypeScript設定

### テスト・品質保証
- [Testing Requirements](./testing-requirements.md) - テスト要件
- [API Testing Guide](./api-testing-guide.md) - APIテストガイド

### エージェント定義
- [Backend TypeScript Architect](../.claude/agents/backend-typescript-architect.md) - バックエンドTypeScriptアーキテクト
- [Database Schema Architect](../.claude/agents/database-schema-architect.md) - データベーススキーマアーキテクト
- [Design Review Architect](../.claude/agents/design-review-architect.md) - 設計レビューアーキテクト
- [Salon Business Expert](../.claude/agents/salon-business-expert.md) - サロンビジネスエキスパート
- [Senior Frontend Architect](../.claude/agents/senior-frontend-architect.md) - シニアフロントエンドアーキテクト
- [Senior UI Designer](../.claude/agents/senior-ui-designer.md) - シニアUIデザイナー
- [TypeSpec API Architect](../.claude/agents/typespec-api-architect.md) - TypeSpec APIアーキテクト