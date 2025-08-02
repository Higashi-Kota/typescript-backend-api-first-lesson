// Export all database schema and relations for type inference
export * from './schema.js'
export * from './relations.js'

// Re-export commonly used types from drizzle-orm for convenience
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
