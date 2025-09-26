// Export all database schema and relations for type inference

// Re-export commonly used types from drizzle-orm for convenience
export type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
// Export migration utilities
export * from './migrations/index'
export * from './relations'
export * from './schema'

// Export SQL script utilities
export * from './scripts/index'
// Export seeding utilities
export * from './seeds/index'
