import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

interface ReviewSeedData {
  salonIds: string[]
  customerIds: string[]
  completedBookingIds: string[]
  staffIds: string[]
}

export async function seedReviews(
  db: PostgresJsDatabase<typeof schema>,
  data: ReviewSeedData
): Promise<string[]> {
  const { salonIds, customerIds, completedBookingIds, staffIds } = data

  if (completedBookingIds.length === 0) {
    console.log('No completed bookings to create reviews for')
    return []
  }

  const reviews = []
  const reviewTexts = [
    {
      title: 'Excellent service!',
      comment:
        'The staff was very professional and friendly. My hair looks amazing!',
      ratings: {
        overall: 5,
        service: 5,
        staff: 5,
        atmosphere: 5,
        cleanliness: 5,
        value: 5,
      },
    },
    {
      title: 'Great experience',
      comment:
        'Really enjoyed my visit. The stylist understood exactly what I wanted.',
      ratings: {
        overall: 5,
        service: 5,
        staff: 5,
        atmosphere: 4,
        cleanliness: 5,
        value: 4,
      },
    },
    {
      title: 'Good but could be better',
      comment: 'Service was good but had to wait despite having a reservation.',
      ratings: {
        overall: 3,
        service: 4,
        staff: 4,
        atmosphere: 3,
        cleanliness: 4,
        value: 3,
      },
    },
    {
      title: 'Satisfied with the result',
      comment:
        'The color turned out exactly as I hoped. Will definitely come back!',
      ratings: {
        overall: 4,
        service: 4,
        staff: 4,
        atmosphere: 4,
        cleanliness: 5,
        value: 4,
      },
    },
    {
      title: 'Amazing head spa',
      comment:
        "The most relaxing head spa experience I've ever had. Highly recommend!",
      ratings: {
        overall: 5,
        service: 5,
        staff: 5,
        atmosphere: 5,
        cleanliness: 5,
        value: 5,
      },
    },
  ]

  // Create reviews for some completed bookings
  const bookingsToReview = completedBookingIds.slice(
    0,
    Math.min(5, completedBookingIds.length)
  )

  for (let i = 0; i < bookingsToReview.length; i++) {
    const bookingId = bookingsToReview[i]
    const reviewData = reviewTexts[i % reviewTexts.length]
    const customerId = customerIds[i % customerIds.length]
    const salonId = salonIds[i % salonIds.length]
    const staffId = staffIds[i % staffIds.length]

    if (!(bookingId && reviewData && customerId && salonId)) {
      continue
    }

    reviews.push({
      salonId,
      customerId,
      bookingId,
      staffId,
      overallRating: reviewData.ratings.overall,
      serviceRating: reviewData.ratings.service,
      staffRating: reviewData.ratings.staff,
      atmosphereRating: reviewData.ratings.atmosphere,
      cleanlinessRating: reviewData.ratings.cleanliness,
      valueRating: reviewData.ratings.value,
      title: reviewData.title,
      comment: reviewData.comment,
      isVerified: true,
      helpfulCount: Math.floor(Math.random() * 20),
      reportCount: 0,
      ownerResponse:
        i === 0
          ? 'Thank you for your wonderful review! We look forward to seeing you again.'
          : undefined,
      ownerRespondedAt: i === 0 ? new Date().toISOString() : undefined,
    })
  }

  if (reviews.length === 0) {
    return []
  }

  const insertedReviews = await db
    .insert(schema.reviews)
    .values(reviews)
    .returning({ id: schema.reviews.id })

  return insertedReviews.map((r) => r.id)
}
