import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export async function seedOpeningHours(
  db: PostgresJsDatabase<typeof schema>,
  salonIds: string[],
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

  // Helper function to get next occurrence of a day
  const getNextOccurrence = (
    dayOfWeek: (typeof daysOfWeek)[number],
  ): string => {
    const today = new Date()
    const dayIndex = daysOfWeek.indexOf(dayOfWeek)
    const currentDay = today.getDay()
    const targetDay = dayIndex === 6 ? 0 : dayIndex + 1 // Convert to JS day (0=Sunday)
    const daysToAdd = (targetDay - currentDay + 7) % 7 || 7
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + daysToAdd)
    const dateString = nextDate.toISOString().split('T')[0]
    if (!dateString) {
      throw new Error('Failed to format date')
    }
    return dateString
  }

  for (const salonId of salonIds) {
    // Regular weekday hours
    for (const day of daysOfWeek.slice(0, 5)) {
      // Monday to Friday
      openingHours.push({
        salonId,
        dayOfWeek: day,
        date: getNextOccurrence(day),
        openTime: '10:00:00',
        closeTime: '20:00:00',
        isHoliday: false,
      })
    }

    // Saturday hours
    openingHours.push({
      salonId,
      dayOfWeek: 'saturday' as const,
      date: getNextOccurrence('saturday'),
      openTime: '09:00:00',
      closeTime: '19:00:00',
      isHoliday: false,
    })

    // Sunday hours
    openingHours.push({
      salonId,
      dayOfWeek: 'sunday' as const,
      date: getNextOccurrence('sunday'),
      openTime: '09:00:00',
      closeTime: '18:00:00',
      isHoliday: false,
    })

    // Add some specific date overrides (holidays)
    openingHours.push(
      {
        salonId,
        dayOfWeek: 'monday' as const, // New Year's Day 2024 was Monday
        date: '2024-01-01',
        isHoliday: true,
        holidayName: "New Year's Day",
        notes: 'Closed for New Year holiday',
      },
      {
        salonId,
        dayOfWeek: 'friday' as const, // Constitution Memorial Day 2024 was Friday
        date: '2024-05-03',
        isHoliday: true,
        holidayName: 'Constitution Memorial Day',
        notes: 'National holiday',
      },
      {
        salonId,
        dayOfWeek: 'tuesday' as const, // New Year's Eve 2024 is Tuesday
        date: '2024-12-31',
        openTime: '10:00:00',
        closeTime: '17:00:00',
        isHoliday: false,
        notes: "Early closing for New Year's Eve",
      },
    )
  }

  const hours = await db
    .insert(schema.openingHours)
    .values(openingHours)
    .returning({ id: schema.openingHours.id })

  return hours.map((h) => h.id)
}
