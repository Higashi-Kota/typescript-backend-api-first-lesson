import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export async function seedSalons(
  db: PostgresJsDatabase<typeof schema>
): Promise<string[]> {
  const salons = await db
    .insert(schema.salons)
    .values([
      {
        name: 'Beauty Studio Tokyo',
        prefecture: 'Tokyo',
        city: 'Shibuya-ku',
        address: '1-2-3 Shibuya',
        phoneNumber: '+81-3-1234-5678',
        email: 'info@beautystudio-tokyo.jp',
        postalCode: '150-0002',
      },
      {
        name: 'Hair & Spa Osaka',
        prefecture: 'Osaka',
        city: 'Naniwa-ku',
        address: '4-5-6 Namba',
        phoneNumber: '+81-6-9876-5432',
        email: 'contact@hairspa-osaka.jp',
        postalCode: '556-0011',
      },
    ])
    .returning({ id: schema.salons.id })

  return salons.map((s) => s.id)
}
