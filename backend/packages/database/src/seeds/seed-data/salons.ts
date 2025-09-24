import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export async function seedSalons(
  db: PostgresJsDatabase<typeof schema>,
): Promise<string[]> {
  const salons = await db
    .insert(schema.salons)
    .values([
      {
        name: 'Beauty Studio Tokyo',
        description: 'Premium beauty salon in the heart of Tokyo',
        prefecture: 'Tokyo',
        city: 'Shibuya-ku',
        address: '1-2-3 Shibuya',
        phoneNumber: '+81-3-1234-5678',
        email: 'info@beautystudio-tokyo.jp',
        postalCode: '150-0002',
        websiteUrl: 'https://beautystudio-tokyo.jp',
        businessHours: [
          {
            dayOfWeek: 'monday',
            operatingSlots: [{ startTime: '10:00', endTime: '20:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'tuesday',
            operatingSlots: [{ startTime: '10:00', endTime: '20:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'wednesday',
            operatingSlots: [{ startTime: '10:00', endTime: '20:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'thursday',
            operatingSlots: [{ startTime: '10:00', endTime: '20:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'friday',
            operatingSlots: [{ startTime: '10:00', endTime: '20:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'saturday',
            operatingSlots: [{ startTime: '10:00', endTime: '18:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'sunday',
            operatingSlots: [],
            breakSlots: null,
            isClosed: true,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
        ],
        rating: '4.8',
        reviewCount: 324,
        features: ['Hair Styling', 'Hair Color', 'Treatment', 'Head Spa'],
        imageUrls: [
          'https://example.com/images/salon1-1.jpg',
          'https://example.com/images/salon1-2.jpg',
        ],
      },
      {
        name: 'Hair & Spa Osaka',
        description: 'Relaxing hair salon and spa in Osaka',
        prefecture: 'Osaka',
        city: 'Naniwa-ku',
        address: '4-5-6 Namba',
        phoneNumber: '+81-6-9876-5432',
        email: 'contact@hairspa-osaka.jp',
        postalCode: '556-0011',
        websiteUrl: 'https://hairspa-osaka.jp',
        businessHours: [
          {
            dayOfWeek: 'monday',
            operatingSlots: [{ startTime: '09:00', endTime: '19:00' }],
            breakSlots: [{ startTime: '13:00', endTime: '14:00' }],
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'tuesday',
            operatingSlots: [{ startTime: '09:00', endTime: '19:00' }],
            breakSlots: [{ startTime: '13:00', endTime: '14:00' }],
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'wednesday',
            operatingSlots: [],
            breakSlots: null,
            isClosed: true,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'thursday',
            operatingSlots: [{ startTime: '09:00', endTime: '19:00' }],
            breakSlots: [{ startTime: '13:00', endTime: '14:00' }],
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'friday',
            operatingSlots: [{ startTime: '09:00', endTime: '19:00' }],
            breakSlots: [{ startTime: '13:00', endTime: '14:00' }],
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'saturday',
            operatingSlots: [{ startTime: '09:00', endTime: '19:00' }],
            breakSlots: [{ startTime: '13:00', endTime: '14:00' }],
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
          {
            dayOfWeek: 'sunday',
            operatingSlots: [{ startTime: '09:00', endTime: '17:00' }],
            breakSlots: null,
            isClosed: false,
            effectivePeriod: null,
            timezone: 'Asia/Tokyo',
          },
        ],
        rating: '4.6',
        reviewCount: 189,
        features: ['Hair Cut', 'Spa', 'Color', 'Perm', 'Treatment'],
        imageUrls: [
          'https://example.com/images/salon2-1.jpg',
          'https://example.com/images/salon2-2.jpg',
          'https://example.com/images/salon2-3.jpg',
        ],
      },
    ])
    .returning({ id: schema.salons.id })

  return salons.map((s) => s.id)
}
