import { env } from '@beauty-salon-backend/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import {
  customers,
  openingHours,
  salons,
  services,
  staff,
} from '../../../packages/infrastructure/src/database/schema.js'

async function seed() {
  console.log('Seeding database...')

  const client = postgres(env.DATABASE_URL, { max: 1 })
  const db = drizzle(client)

  try {
    // Create a sample salon
    const insertedSalons = await db
      .insert(salons)
      .values({
        name: 'Beauty Haven',
        description: 'Your premier destination for beauty and relaxation',
        address: {
          street: '123 Main Street',
          city: 'Tokyo',
          state: 'Tokyo',
          postalCode: '100-0001',
          country: 'Japan',
        },
        email: 'info@beautyhaven.jp',
        phoneNumber: '+81-3-1234-5678',
      })
      .returning()

    if (!insertedSalons[0]) {
      throw new Error('Failed to insert salon')
    }
    const salonId = insertedSalons[0].id

    // Add opening hours
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ] as const
    const openingHoursData = days.map((day) => ({
      salonId,
      dayOfWeek: day,
      openTime: day === 'sunday' ? '10:00' : '09:00',
      closeTime: day === 'sunday' ? '18:00' : '20:00',
      isHoliday: false,
    }))
    await db.insert(openingHours).values(openingHoursData)

    // Create staff members
    const staffMembers = [
      {
        salonId,
        name: 'Yuki Tanaka',
        email: 'yuki@beautyhaven.jp',
        phoneNumber: '+81-90-1234-5678',
        specialties: ['cut', 'color'],
        isActive: true,
      },
      {
        salonId,
        name: 'Sakura Yamamoto',
        email: 'sakura@beautyhaven.jp',
        phoneNumber: '+81-90-2345-6789',
        specialties: ['perm', 'treatment'],
        isActive: true,
      },
      {
        salonId,
        name: 'Hiroshi Sato',
        email: 'hiroshi@beautyhaven.jp',
        phoneNumber: '+81-90-3456-7890',
        specialties: ['cut', 'spa'],
        isActive: true,
      },
    ]
    await db.insert(staff).values(staffMembers)

    // Create services
    const servicesData = [
      {
        salonId,
        name: 'Hair Cut',
        description: 'Professional hair cutting service',
        duration: 45,
        price: 4500,
        category: 'cut' as const,
        isActive: true,
      },
      {
        salonId,
        name: 'Hair Color',
        description: 'Full hair coloring service',
        duration: 120,
        price: 8000,
        category: 'color' as const,
        isActive: true,
      },
      {
        salonId,
        name: 'Digital Perm',
        description: 'Modern digital perm treatment',
        duration: 180,
        price: 12000,
        category: 'perm' as const,
        isActive: true,
      },
      {
        salonId,
        name: 'Hair Treatment',
        description: 'Deep conditioning hair treatment',
        duration: 60,
        price: 5500,
        category: 'treatment' as const,
        isActive: true,
      },
      {
        salonId,
        name: 'Head Spa',
        description: 'Relaxing head spa treatment',
        duration: 45,
        price: 4000,
        category: 'spa' as const,
        isActive: true,
      },
    ]
    await db.insert(services).values(servicesData)

    // Create sample customers
    const customersData = [
      {
        name: 'Keiko Tanaka',
        email: 'keiko.tanaka@example.com',
        phoneNumber: '+81-90-1111-2222',
        preferences: 'Prefers organic products',
      },
      {
        name: 'Taro Yamada',
        email: 'taro.yamada@example.com',
        phoneNumber: '+81-90-3333-4444',
      },
      {
        name: 'Hanako Suzuki',
        email: 'hanako.suzuki@example.com',
        phoneNumber: '+81-90-5555-6666',
        preferences: 'Sensitive scalp, needs gentle products',
      },
    ]
    await db.insert(customers).values(customersData)

    console.log('Database seeded successfully!')
    await client.end()
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error)
    await client.end()
    process.exit(1)
  }
}

seed()
