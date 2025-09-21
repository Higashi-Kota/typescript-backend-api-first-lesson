// Re-export schemas only (models.ts was removed as unused)
export * from './schema'

// Re-export OpenAPI types
export type {
  components,
  paths,
  operations,
  webhooks,
  $defs,
} from './api-types'

import type { components } from './api-types'

// Components and Schemas types (if needed for backward compatibility)
export type Components = components
export type Schemas = components['schemas']
