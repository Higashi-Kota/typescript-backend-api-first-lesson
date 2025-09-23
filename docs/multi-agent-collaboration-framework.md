# Agent-to-Agent Design Validation Protocol

## 概要

設計フェーズにおいて、実装前に型・定義の不整合を防ぐためのエージェント間自律検証プロトコルです。各エージェントは設計成果物（Design Artifact）を生成し、[Design Review Architect](../.claude/agents/design-review-architect.md)が中心となって型同期を検証します。

本プロトコルは[CLAUDE.md](../CLAUDE.md)で定義された開発原則および[アーキテクチャ概要](./architecture-overview.md)に準拠しています。

## 🏗️ アーキテクチャ前提

### API-DB整合性の必須要件

[TypeSpec API Type Rules](./typespec-api-type-rules.md)で定義された以下の制約を全エージェントが遵守：

1. **プロパティ名の完全一致**: API定義のプロパティ名はDB定義のカラム名と完全一致
2. **Nullable性の統一**: DBのNULL制約とAPIのnullable型が完全一致
3. **Optional制約**: Optionalフィールドは検索・更新APIのみ
4. **ブランド型の使用**: 全エンティティIDにブランド型を使用
5. **API-DB不整合の禁止**: API定義にあってDB定義にないプロパティは許可しない

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

### Documentation Artifact

[Documentation Specialist](../.claude/agents/documentation-specialist.md)が生成する成果物：

```typescript
interface DocumentationArtifact {
  implementationPatterns: {
    [patternName: string]: {
      category: "api" | "database" | "business-logic" | "integration" | "testing"
      description: string
      applicability: string[]  // どのドメインで適用可能か
      template: {
        genericForm: string  // 汎用的なパターン
        exampleImplementation: string  // 具体的な実装例
        adaptationPoints: Array<{
          aspect: string
          considerations: string[]
        }>
      }
    }
  }
  referenceGuides: {
    [guideName: string]: {
      targetAudience: "backend" | "frontend" | "fullstack"
      prerequisites: string[]
      steps: Array<{
        title: string
        description: string
        codeExample?: string
        checkpoints: string[]
      }>
    }
  }
  lessonsLearned: {
    [domainName: string]: Array<{
      challenge: string
      solution: string
      reusableApproach: boolean
    }>
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

### Phase 4: Implementation Documentation
```
[All Implementation Agents] (並行実装)
    ↓ [Implementation Changes via git commit]
[Documentation Specialist](../.claude/agents/documentation-specialist.md)
    ↓ [Change Analysis via git status/diff]
    ├→ [Pattern Extraction]
    ├→ [Reference Guide Creation]
    └→ [Documentation Updates]
    ↓ [Updated Documentation]
[Design Review Architect](../.claude/agents/design-review-architect.md)
    ↓ [Documentation Review & Validation]
```

[Documentation Specialist](../.claude/agents/documentation-specialist.md)は、実装完了後に以下を実施：
- 実装変更の分析と パターン抽出
- リファレンス実装ガイドの作成
- 他ドメイン実装時に活用可能なテンプレート化
- 既存ドキュメントとの整合性確認と更新

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

    // Nullable in DB → Nullable in API (All models)
    nullableConsistency: (dbNullable: boolean, apiNullable: boolean) =>
      dbNullable === apiNullable

    // Update models: Optional + Nullable for nullable base fields
    updateModelConsistency: (baseNullable: boolean, updateOptional: boolean, updateNullable: boolean) =>
      updateOptional && (baseNullable ? updateNullable : !updateNullable)
  }
}
```

### Level 4: Nullable Field Rules

全モデルタイプにおけるnullable制約の統一ルール：

```typescript
interface NullableFieldValidation {
  // 基本モデル: DBのnullable制約と完全一致
  baseModel: (dbNullable: boolean, apiField: string) =>
    dbNullable ? `${apiField}: Type | null` : `${apiField}: Type`

  // 作成リクエスト: 全フィールド必須、nullable値許可
  createRequest: (dbNullable: boolean, apiField: string) =>
    dbNullable ? `${apiField}: Type | null` : `${apiField}: Type`

  // 更新リクエスト: 全フィールドOptional、基本モデルnullableならnull許可
  updateRequest: (dbNullable: boolean, apiField: string) =>
    dbNullable ? `${apiField}?: Type | null` : `${apiField}?: Type`

  // 検索パラメータ: フィルター項目のみOptional（nullableは不要）
  searchParams: (apiField: string) => `${apiField}?: Type`

  // ラッパーモデル: 基本モデルと同じルール適用
  wrapperModel: (nullable: boolean, apiField: string) =>
    nullable ? `${apiField}: Type | null` : `${apiField}: Type`
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

### API-DB Property Validation Checklist

各エージェントが協業して確認すべき項目：

#### 1. プロパティ存在性チェック（Database Schema Architect + TypeSpec API Architect）
- [ ] APIで定義された全プロパティに対応するDBカラムが存在する
- [ ] DBカラムが存在しないAPIプロパティを検出し、マイグレーション要否を判定
- [ ] 新規プロパティ追加時にDB側のALTER TABLE文が生成される

#### 2. プロパティ名一致チェック（Design Review Architect）
- [ ] snake_case（DB） → camelCase（API）の変換規則が一貫している
- [ ] UIの入出力集約粒度都合による以外の名前変更がない（例: website → websiteUrl）
- [ ] Mapperで不要な名前変換を行っていない

#### 3. Nullable性一致チェック（全エージェント）
- [ ] DBのNULL制約とAPIのnullable型が完全一致
- [ ] nullを空文字列やデフォルト値に変換していない
- [ ] Optional + Nullableの組み合わせが適切（更新APIでのリセット機能）

#### 4. Optional制約チェック（TypeSpec API Architect）
- [ ] 基本モデル: Optionalフィールドなし、DBのnullable制約に応じて `| null`
- [ ] 作成API: Optionalフィールドなし（全て必須、値はnullable）
- [ ] 更新API: 全フィールドOptional（部分更新）、基本モデルでnullableなフィールドは `| null` 追加
- [ ] 検索API: フィルター項目のみOptional
- [ ] レスポンス: Optionalフィールドなし（全て必須）
- [ ] ラッパーモデル（ApiResponse等）: 基本モデルと同じnullableルール適用

#### 5. 更新モデル統合チェック（Design Review Architect）
- [ ] 各ドメインにUpdateRequestモデルが1つだけ存在する
- [ ] 基本モデルでnullableなフィールドのみ `| null` が付与されている
- [ ] @docコメントに「null指定で値をリセット可能」が記載されている（該当する場合）

#### 6. Nullable整合性チェック（全エージェント）
- [ ] 基本モデル: 全フィールドがDBのnullable制約と一致
- [ ] 作成モデル: 基本モデルのnullable制約を継承
- [ ] 更新モデル: Optional + 条件付きnullable（基本モデル準拠）
- [ ] ラッパーモデル: nullable制約が基本モデルルールに従う
- [ ] Optionalのみの不正なフィールドが存在しない

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

### Checkpoint 4: Documentation Consistency
```typescript
interface DocumentationConsistencyCheck {
  validate(): CheckResult {
    // Check if patterns are documented
    for (const pattern of implementedPatterns) {
      if (!documentationArtifact.implementationPatterns[pattern.name]) {
        return { pass: false, error: `Undocumented pattern: ${pattern.name}` }
      }
    }

    // Check if reference guides cover all domains
    for (const domain of implementedDomains) {
      const hasGuide = Object.values(documentationArtifact.referenceGuides)
        .some(guide => guide.steps.some(step => step.codeExample?.includes(domain)))

      if (!hasGuide) {
        return { pass: false, error: `Missing reference guide for ${domain}` }
      }
    }

    // Check if documentation reflects actual implementation
    const codePatterns = extractPatternsFromCode()
    const docPatterns = Object.keys(documentationArtifact.implementationPatterns)
    const undocumented = codePatterns.filter(p => !docPatterns.includes(p))

    if (undocumented.length > 0) {
      return { pass: false, error: `Undocumented patterns: ${undocumented.join(', ')}` }
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
  documentationUpdated: boolean        // ドキュメントが実装と同期
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

    // 6. Document implementation patterns
    await this.documentImplementation()

    return { status: "VALIDATED", artifacts: this.finalArtifacts }
  }

  async documentImplementation(): Promise<void> {
    // Documentation Specialist analyzes and documents patterns
    const docArtifact = await this.documentationSpecialist.analyze({
      implementations: this.getImplementationChanges(),
      existingDocs: this.getCurrentDocumentation()
    })

    // Update relevant documentation files
    await this.updateDocumentation(docArtifact)

    this.criteria.documentationUpdated = true
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
- [Documentation Specialist](../.claude/agents/documentation-specialist.md) - ドキュメンテーションスペシャリスト
- [Salon Business Expert](../.claude/agents/salon-business-expert.md) - サロンビジネスエキスパート
- [Senior Frontend Architect](../.claude/agents/senior-frontend-architect.md) - シニアフロントエンドアーキテクト
- [Senior UI Designer](../.claude/agents/senior-ui-designer.md) - シニアUIデザイナー
- [TypeSpec API Architect](../.claude/agents/typespec-api-architect.md) - TypeSpec APIアーキテクト