// Export all database schema and relations for type inference
export * from './schema'
export * from './relations'

// Export migration utilities
export * from './migrations/index'

// Export seeding utilities
export * from './seeds/index'

// Export SQL script utilities
export * from './scripts/index'

// Re-export commonly used types from drizzle-orm for convenience
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
