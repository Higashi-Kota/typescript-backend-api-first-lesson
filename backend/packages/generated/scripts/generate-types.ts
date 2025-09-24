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
    '../../../../specs/tsp-output/@typespec/openapi3/generated/openapi.yaml',
  ),
  outputDir: resolve(__dirname, '../src'),
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

  // Create final api-types.ts directly in src/
  const apiTypesContent = createApiTypesFile(baseTypes)
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
  console.log('  - api-types.ts')
  console.log('  - schema.ts')
  console.log('  - index.ts')
}

/**
 * Create the main api-types.ts file with enhanced JSDoc comments
 */
function createApiTypesFile(baseTypes: string): string {
  // Read OpenAPI to get enum descriptions
  const openApiContent = readFileSync(CONFIG.openApiPath, 'utf-8')
  const openApi = parse(openApiContent)
  const schemas = openApi.components?.schemas ?? {}

  // Extract enum descriptions
  const enumDescriptions = new Map<string, string>()
  for (const [key, schema] of Object.entries(schemas)) {
    const name = key.split('.').pop() ?? key
    if (
      // biome-ignore lint/suspicious/noExplicitAny: OpenAPI schema objects from YAML parsing have complex types
      (schema as any).type === 'string' &&
      // biome-ignore lint/suspicious/noExplicitAny: Accessing dynamic properties from parsed YAML
      (schema as any).enum &&
      // biome-ignore lint/suspicious/noExplicitAny: Schema description from dynamic YAML structure
      (schema as any).description
    ) {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing dynamic properties from parsed YAML
      enumDescriptions.set(name, (schema as any).description)
    }
  }

  // Process base types to enhance JSDoc comments for enums
  let processedTypes = baseTypes

  // Replace existing enum JSDoc comments with properly formatted ones
  for (const [enumName, description] of enumDescriptions) {
    // Format description for JSDoc with proper line breaks
    const formattedDescription = formatEnumDescription(description)

    // Create the full enum name as it appears in the generated types
    const fullEnumName = `"Models.${enumName}"`

    // Create a regex to match the JSDoc comment followed by the enum definition
    // This will match:
    // /**
    //  * @description ...
    //  * @enum {string}
    //  */
    // "Models.EnumName": ...
    const enumRegex = new RegExp(
      `(\\s*)/\\*\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/\\s*${fullEnumName.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}:`,
      'gm',
    )

    processedTypes = processedTypes.replace(enumRegex, (_match, indent) => {
      // Extract just the enum definition part (after the colon)
      const enumDefinition = `${fullEnumName}:`

      // Build the new JSDoc comment with proper formatting
      const docLines = formattedDescription.split('\n')
      let jsdocComment = `${indent}/**\n`
      jsdocComment += `${indent} * @description\n`

      for (const line of docLines) {
        if (line === '') {
          jsdocComment += `${indent} *\n`
        } else {
          jsdocComment += `${indent} * ${line}\n`
        }
      }

      jsdocComment += `${indent} * @enum {string}\n`
      jsdocComment += `${indent} */\n`
      jsdocComment += `${indent}${enumDefinition}`

      return jsdocComment
    })
  }

  return `// Generated from TypeSpec/OpenAPI using openapi-typescript
// DO NOT EDIT MANUALLY
// Last generated: ${new Date().toISOString()}

// Base types from OpenAPI
${processedTypes}
`
}

/**
 * Generate additional supporting files
 */
async function generateAdditionalFiles(
  openApiPath: string,
  outputDir: string,
): Promise<void> {
  const openApiContent = readFileSync(openApiPath, 'utf-8')
  const openApi = parse(openApiContent)

  // Generate Zod schemas for validation - output as schema.ts
  const zodSchemas = generateZodSchemas(openApi)
  writeFileSync(join(outputDir, 'schema.ts'), zodSchemas)

  // NOTE: Removed brand-helpers.ts generation - completely unused
  // Domain package has its own brand implementation
}

/**
 * Format enum description for JSDoc comments
 * Ensures proper line breaks for VSCode hover display
 */
function formatEnumDescription(description: string): string {
  // Split by newlines to preserve formatting
  const lines = description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  // Find lines with key:value format and add proper spacing
  const formattedLines: string[] = []
  let isHeaderSection = true

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line) {
      // Check if this line contains an enum value description (has colon after a key)
      // Pattern: "KEY: description" or "number: description" or "lowercase_key: description"
      if (line.match(/^[A-Za-z0-9_]+:|^\d+:/)) {
        // We're now in the values section
        if (isHeaderSection) {
          // Add two empty lines after header before first value
          formattedLines.push('')
          formattedLines.push('')
          isHeaderSection = false
        } else {
          // Add one empty line between each enum value
          formattedLines.push('')
        }
        formattedLines.push(line)
      } else {
        // Header or continuation lines
        formattedLines.push(line)
      }
    }
  }

  return formattedLines.join('\n')
}

/**
 * Generate Zod validation schemas with JSDoc comments
 * NOTE: Removed unused schemas per YAGNI principle
 * - Brand ID schemas: domain has its own brand implementation
 * - Common schemas: not used anywhere in codebase
 * Only keeping enum schemas that are generated from OpenAPI
 */
// biome-ignore lint/suspicious/noExplicitAny: OpenAPI spec from YAML parsing has dynamic structure
function generateZodSchemas(openApi: any): string {
  const schemas = openApi.components?.schemas ?? {}

  let content = `import { z } from 'zod'

`

  // Generate enum schemas with JSDoc comments
  for (const [key, schema] of Object.entries(schemas)) {
    const name = key.split('.').pop() ?? key
    // biome-ignore lint/suspicious/noExplicitAny: OpenAPI schema objects from YAML parsing have complex types
    if ((schema as any).type === 'string' && (schema as any).enum) {
      // biome-ignore lint/suspicious/noExplicitAny: Enum values from dynamic YAML structure
      const enumValues = (schema as any).enum as string[]
      // biome-ignore lint/suspicious/noExplicitAny: Description field from parsed schema
      const description = (schema as any).description

      // Add JSDoc comment for the Schema export
      if (description) {
        const formattedDescription = formatEnumDescription(description)
        const docLines = formattedDescription.split('\n')

        content += '/**\n'
        content += ' * @description\n'
        for (const line of docLines) {
          // Preserve empty lines in JSDoc comments
          if (line === '') {
            content += ' *\n'
          } else {
            content += ` * ${line}\n`
          }
        }
        content += ' */\n'
      }

      // Generate schema
      const enumValuesFormatted = enumValues.map((v) => `'${v}'`).join(', ')

      // Split long enum arrays across multiple lines for readability
      if (enumValuesFormatted.length > 80) {
        const formattedValues = enumValues.map((v) => `  '${v}'`).join(',\n')
        content += `export const ${name}Schema = z.enum([\n${formattedValues}\n])\n`
      } else {
        content += `export const ${name}Schema = z.enum([${enumValuesFormatted}])\n`
      }

      // Add the same JSDoc comment for the Type export
      if (description) {
        const formattedDescription = formatEnumDescription(description)
        const docLines = formattedDescription.split('\n')

        content += '/**\n'
        content += ' * @description\n'
        for (const line of docLines) {
          // Preserve empty lines in JSDoc comments
          if (line === '') {
            content += ' *\n'
          } else {
            content += ` * ${line}\n`
          }
        }
        content += ' */\n'
      }

      content += `export type ${name} = z.infer<typeof ${name}Schema>\n\n`
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
export * from './schema';
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
