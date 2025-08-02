#!/usr/bin/env tsx

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))

// OpenAPIからTypeScript型定義を生成（openapi-typescript CLIを使用）
async function generateTypesFromOpenAPI() {
  const openApiPath = join(
    __dirname,
    '../specs/tsp-output/@typespec/openapi3/generated/openapi.yaml'
  )
  const outputDir = join(__dirname, '../backend/packages/types/src/generated')
  const tempOutput = join(outputDir, 'api-types-temp.ts')

  // 出力ディレクトリを作成
  mkdirSync(outputDir, { recursive: true })

  console.log('🔧 Generating types with openapi-typescript...')

  // openapi-typescript CLIを使用して型を生成
  try {
    execSync(`npx openapi-typescript "${openApiPath}" -o "${tempOutput}"`, {
      stdio: 'inherit',
    })
  } catch (error) {
    console.error('Failed to generate types:', error)
    process.exit(1)
  }

  // 生成された型を読み込み
  const typesContent = readFileSync(tempOutput, 'utf-8')

  // Brand型の定義を追加
  const brandTypeDefinition = `// Brand type utilities
export const brand = Symbol('brand');
export type Brand<T, B> = T & { [brand]: B };

`

  // カスタムヘルパー型を追加
  const helperTypes = `
// Helper types for API request/response
export type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Extract component types
export type Components = components extends { schemas: infer S } ? S : never;
export type Schemas = Components;

// Request/Response type extractors
export type ExtractRequest<T> = T extends {
  requestBody?: { content: { 'application/json': infer R } }
} ? R : never;

export type ExtractResponse<T, Status extends number = 200> = T extends {
  responses: {
    [K in Status]: { content: { 'application/json': infer R } }
  }
} ? R : T extends {
  responses: {
    [K in Status]: { content: { '*/*': infer R } }
  }
} ? R : never;

export type ExtractParams<T> = T extends {
  parameters: {
    path?: infer P
  }
} ? P : Record<string, never>;

export type ExtractQuery<T> = T extends {
  parameters: {
    query?: infer Q
  }
} ? Q : Record<string, never>;

// Operation helpers
export type GetOperation<Path extends keyof paths, Method extends keyof paths[Path]> = 
  paths[Path][Method];

// Specific operation types
export type CustomerListOperation = GetOperation<'/api/v1/customers', 'get'>;
export type CustomerCreateOperation = GetOperation<'/api/v1/customers', 'post'>;
export type CustomerGetOperation = GetOperation<'/api/v1/customers/{id}', 'get'>;
export type CustomerUpdateOperation = GetOperation<'/api/v1/customers/{id}', 'put'>;

// Extract types from operations
export type CustomerListQuery = ExtractQuery<CustomerListOperation>;
export type CustomerListResponse = ExtractResponse<CustomerListOperation>;
export type CustomerCreateRequest = ExtractRequest<CustomerCreateOperation>;
export type CustomerCreateResponse = ExtractResponse<CustomerCreateOperation, 201>;
`

  // 最終的な型定義ファイルを生成
  const finalContent = `// Generated from TypeSpec/OpenAPI using openapi-typescript
// DO NOT EDIT MANUALLY

${brandTypeDefinition}
${typesContent}
${helperTypes}`

  // api-types.tsとして出力
  writeFileSync(join(outputDir, 'api-types.ts'), finalContent)

  // 一時ファイルを削除
  try {
    const fs = await import('node:fs/promises')
    await fs.unlink(tempOutput)
  } catch {}

  // Brand型作成ヘルパーを別ファイルで生成
  const brandHelpers = await generateBrandHelpers(openApiPath)
  writeFileSync(join(outputDir, 'brand-helpers.ts'), brandHelpers)

  // Zodスキーマも生成（後方互換性のため）
  const zodSchemas = await generateZodSchemas(openApiPath)
  writeFileSync(join(outputDir, 'schemas.ts'), zodSchemas)

  // index.tsでエクスポート
  const indexContent = `// Generated from TypeSpec/OpenAPI
// DO NOT EDIT MANUALLY

export * from './api-types';
export * from './brand-helpers';
export * from './schemas';
`
  writeFileSync(join(outputDir, 'index.ts'), indexContent)

  console.log(
    '✅ Backend types generated successfully using openapi-typescript!'
  )
}

// Brand型のヘルパー関数を生成
async function generateBrandHelpers(openApiPath: string): Promise<string> {
  const openApiContent = readFileSync(openApiPath, 'utf-8')
  const openApi = parse(openApiContent)
  const schemas = openApi.components?.schemas ?? {}

  let helpers = `import type { Brand } from './api-types';

// Brand type creators
`

  const brandTypes: string[] = []

  for (const [key, schema] of Object.entries(schemas)) {
    const name = key.split('.').pop() ?? key
    if (name.endsWith('Id') && (schema as any).type === 'string') {
      brandTypes.push(name)
      helpers += `export type ${name} = Brand<string, '${name}'>;\n`
      helpers += `export const create${name} = (value: string): ${name} => value as ${name};\n\n`
    }
  }

  return helpers
}

// Zodスキーマを生成（後方互換性のため）
async function generateZodSchemas(openApiPath: string): Promise<string> {
  const openApiContent = readFileSync(openApiPath, 'utf-8')
  const openApi = parse(openApiContent)
  const schemas = openApi.components?.schemas ?? {}

  let zodSchemas = `import { z } from 'zod';
import type { Brand } from './api-types';

// UUID validation
const isValidUuid = (val: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
};

`

  // Brand型のZodスキーマ
  for (const [key, schema] of Object.entries(schemas)) {
    const name = key.split('.').pop() ?? key
    if (name.endsWith('Id') && (schema as any).type === 'string') {
      zodSchemas += `export const ${name}Schema = z.string().refine(
  (val): val is Brand<string, '${name}'> => isValidUuid(val),
  { message: 'Invalid ${name} format' }
);\n\n`
    }

    // Enum型のZodスキーマ
    if ((schema as any).type === 'string' && (schema as any).enum) {
      zodSchemas += `export const ${name}Schema = z.enum([${(schema as any).enum
        .map((v: string) => `'${v}'`)
        .join(', ')}]);\n`
      zodSchemas += `export type ${name} = z.infer<typeof ${name}Schema>;\n\n`
    }
  }

  return zodSchemas
}

// 実行
generateTypesFromOpenAPI().catch(console.error)
