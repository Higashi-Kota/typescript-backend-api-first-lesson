import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export interface ServiceCategorySeedResult {
  categoryIds: string[]
  categoryMap: Record<string, string>
}

export async function seedServiceCategories(
  db: PostgresJsDatabase<typeof schema>,
  salonIds: string[],
): Promise<ServiceCategorySeedResult> {
  const categories = []
  const categoryMap: Record<string, string> = {}

  for (const salonId of salonIds) {
    categories.push(
      {
        salonId,
        name: 'Hair Cut',
        description: 'Professional hair cutting services',
        category: 'cut' as const,
        displayOrder: 1,
        color: '#FF6B6B',
        isActive: true,
      },
      {
        salonId,
        name: 'Hair Color',
        description: 'Hair coloring and highlighting services',
        category: 'color' as const,
        displayOrder: 2,
        color: '#4ECDC4',
        isActive: true,
      },
      {
        salonId,
        name: 'Perm',
        description: 'Permanent wave and straightening services',
        category: 'perm' as const,
        displayOrder: 3,
        color: '#45B7D1',
        isActive: true,
      },
      {
        salonId,
        name: 'Hair Treatment',
        description: 'Hair care and treatment services',
        category: 'treatment' as const,
        displayOrder: 4,
        color: '#96CEB4',
        isActive: true,
      },
      {
        salonId,
        name: 'Head Spa',
        description: 'Relaxing head spa and scalp treatments',
        category: 'spa' as const,
        displayOrder: 5,
        color: '#DDA0DD',
        isActive: true,
      },
      {
        salonId,
        name: 'Styling',
        description: 'Professional hair styling services',
        category: 'styling' as const,
        displayOrder: 6,
        color: '#FFD93D',
        isActive: true,
      },
      {
        salonId,
        name: 'Hair Extension',
        description: 'Hair extension and volume services',
        category: 'extension' as const,
        displayOrder: 7,
        color: '#6BCB77',
        isActive: true,
      },
      {
        salonId,
        name: 'Other Services',
        description: 'Additional beauty services',
        category: 'other' as const,
        displayOrder: 8,
        color: '#B8B8B8',
        isActive: true,
      },
    )
  }

  const insertedCategories = await db
    .insert(schema.serviceCategories)
    .values(categories)
    .returning({
      id: schema.serviceCategories.id,
      salonId: schema.serviceCategories.salonId,
      category: schema.serviceCategories.category,
    })

  // Build category map for easy lookup
  for (const cat of insertedCategories) {
    const key = `${cat.salonId}_${cat.category}`
    categoryMap[key] = cat.id
  }

  return {
    categoryIds: insertedCategories.map((c) => c.id),
    categoryMap,
  }
}
