import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export async function seedOpeningHours(
  db: PostgresJsDatabase<typeof schema>,
  salonIds: string[]
): Promise<string[]> {
  const openingHours = []
  const daysOfWeek = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ] as const

  for (const salonId of salonIds) {
    // Regular weekday hours
    for (const day of daysOfWeek.slice(0, 5)) {
      // Monday to Friday
      openingHours.push({
        salonId,
        dayOfWeek: day,
        openTime: '10:00:00',
        closeTime: '20:00:00',
        isHoliday: false,
      })
    }

    // Saturday hours
    openingHours.push({
      salonId,
      dayOfWeek: 'saturday' as const,
      openTime: '09:00:00',
      closeTime: '19:00:00',
      isHoliday: false,
    })

    // Sunday hours
    openingHours.push({
      salonId,
      dayOfWeek: 'sunday' as const,
      openTime: '09:00:00',
      closeTime: '18:00:00',
      isHoliday: false,
    })

    // Add some specific date overrides (holidays)
    openingHours.push(
      {
        salonId,
        specificDate: '2024-01-01',
        isHoliday: true,
        holidayName: "New Year's Day",
        notes: 'Closed for New Year holiday',
      },
      {
        salonId,
        specificDate: '2024-05-03',
        isHoliday: true,
        holidayName: 'Constitution Memorial Day',
        notes: 'National holiday',
      },
      {
        salonId,
        specificDate: '2024-12-31',
        openTime: '10:00:00',
        closeTime: '17:00:00',
        isHoliday: false,
        notes: "Early closing for New Year's Eve",
      }
    )
  }

  const hours = await db
    .insert(schema.openingHours)
    .values(openingHours)
    .returning({ id: schema.openingHours.id })

  return hours.map((h) => h.id)
}
