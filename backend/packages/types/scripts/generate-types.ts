#!/usr/bin/env tsx

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Configuration
const CONFIG = {
  openApiPath: resolve(
    __dirname,
    '../../../../specs/tsp-output/@typespec/openapi3/generated/openapi.yaml'
  ),
  outputDir: resolve(__dirname, '../src/generated'),
  tempFile: 'api-types-temp.ts',
}

/**
 * Main type generation function using openapi-typescript
 */
async function generateTypesFromOpenAPI(): Promise<void> {
  const { openApiPath, outputDir, tempFile } = CONFIG
  const tempOutput = join(outputDir, tempFile)

  // Ensure OpenAPI file exists
  if (!existsSync(openApiPath)) {
    console.error(`❌ OpenAPI file not found at: ${openApiPath}`)
    console.error('Please run "pnpm generate:spec" first')
    process.exit(1)
  }

  // Create output directory
  mkdirSync(outputDir, { recursive: true })

  console.log('🔧 Generating types from OpenAPI specification...')
  console.log(`📄 Input: ${openApiPath}`)
  console.log(`📁 Output: ${outputDir}`)

  // Generate types using openapi-typescript CLI
  try {
    execSync(`npx openapi-typescript "${openApiPath}" -o "${tempOutput}"`, {
      stdio: 'inherit',
      cwd: dirname(__dirname), // Run from package root
    })
  } catch (error) {
    console.error('❌ Failed to generate types:', error)
    process.exit(1)
  }

  // Read and enhance generated types
  const baseTypes = readFileSync(tempOutput, 'utf-8')

  // Generate additional type utilities
  const brandTypes = generateBrandTypes()
  const helperTypes = generateHelperTypes()
  const extractorTypes = generateExtractorTypes()

  // Create final api-types.ts
  const apiTypesContent = createApiTypesFile(
    baseTypes,
    brandTypes,
    helperTypes,
    extractorTypes
  )
  writeFileSync(join(outputDir, 'api-types.ts'), apiTypesContent)

  // Generate additional files
  await generateAdditionalFiles(openApiPath, outputDir)

  // Clean up temp file
  try {
    const fs = await import('node:fs/promises')
    await fs.unlink(tempOutput)
  } catch {
    // Ignore cleanup errors
  }

  // Create index file
  createIndexFile(outputDir)

  console.log('✅ Type generation complete!')
  console.log(`📦 Generated files in: ${outputDir}`)
}

/**
 * Generate Brand type utilities
 * NOTE: Currently unused - domain package has its own Brand implementation
 * Keeping empty to maintain file structure for now
 */
function generateBrandTypes(): string {
  return ''
}

/**
 * Generate helper type utilities
 * NOTE: Removed unused types per YAGNI principle
 * - Result/Ok/Err: domain has its own implementation
 * - Nullable/DeepPartial/DeepReadonly: not used anywhere
 */
function generateHelperTypes(): string {
  return ''
}

/**
 * Generate type extractors for API operations
 * NOTE: Removed unused extractors per YAGNI principle
 * Only keeping what's actually needed
 */
function generateExtractorTypes(): string {
  return `// Type extractors for API operations
export type Components = components extends { schemas: infer S } ? S : never;
export type Schemas = Components;
export type Paths = paths;
export type Operations = operations;
`
}

/**
 * Create the main api-types.ts file
 */
function createApiTypesFile(
  baseTypes: string,
  brandTypes: string,
  helperTypes: string,
  extractorTypes: string
): string {
  return `// Generated from TypeSpec/OpenAPI using openapi-typescript
// DO NOT EDIT MANUALLY
// Last generated: ${new Date().toISOString()}

${brandTypes}

${helperTypes}

// Base types from OpenAPI
${baseTypes}

${extractorTypes}

// Removed unused operation types per YAGNI principle
// These were never imported or used anywhere in the codebase
`
}

/**
 * Generate additional supporting files
 */
async function generateAdditionalFiles(
  openApiPath: string,
  outputDir: string
): Promise<void> {
  const openApiContent = readFileSync(openApiPath, 'utf-8')
  const openApi = parse(openApiContent)

  // Generate Zod schemas for validation
  const zodSchemas = generateZodSchemas(openApi)
  writeFileSync(join(outputDir, 'schemas.ts'), zodSchemas)

  // NOTE: Removed brand-helpers.ts generation - completely unused
  // Domain package has its own brand implementation
}

/**
 * Generate Zod validation schemas
 * NOTE: Removed unused schemas per YAGNI principle
 * - Brand ID schemas: domain has its own brand implementation
 * - Common schemas: not used anywhere in codebase
 * Only keeping enum schemas that are generated from OpenAPI
 */
// biome-ignore lint/suspicious/noExplicitAny: OpenAPI spec type is complex
function generateZodSchemas(openApi: any): string {
  const schemas = openApi.components?.schemas ?? {}

  let content = `import { z } from 'zod';

`

  // Generate enum schemas
  for (const [key, schema] of Object.entries(schemas)) {
    const name = key.split('.').pop() ?? key
    // biome-ignore lint/suspicious/noExplicitAny: Schema type from YAML parsing
    if ((schema as any).type === 'string' && (schema as any).enum) {
      // biome-ignore lint/suspicious/noExplicitAny: Enum array from YAML
      const enumValues = (schema as any).enum as string[]
      content += `export const ${name}Schema = z.enum([${enumValues.map((v) => `'${v}'`).join(', ')}]);\n`
      content += `export type ${name} = z.infer<typeof ${name}Schema>;\n\n`
    }
  }

  return content
}

// Removed generateBrandHelpers function - completely unused
// Domain package has its own brand implementation

/**
 * Create index file for clean exports
 */
function createIndexFile(outputDir: string): void {
  const indexContent = `// Generated from TypeSpec/OpenAPI
// DO NOT EDIT MANUALLY
// Last generated: ${new Date().toISOString()}

// Main API types and utilities
export * from './api-types';

// Zod validation schemas
export * from './schemas';

// Re-export commonly used types for convenience
export type {
  // API types
  Components,
  Schemas,
  Paths,
  Operations,
} from './api-types';
`

  writeFileSync(join(outputDir, 'index.ts'), indexContent)
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTypesFromOpenAPI().catch((error) => {
    console.error('❌ Type generation failed:', error)
    process.exit(1)
  })
}

export { generateTypesFromOpenAPI }
