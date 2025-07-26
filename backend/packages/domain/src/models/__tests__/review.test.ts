/**
 * Review ドメインモデルの単体テスト
 * CLAUDE.mdのテスト要件に徹底準拠
 */

import { match } from 'ts-pattern'
import { describe, expect, it } from 'vitest'
import { createCustomerId } from '../customer.js'
import { createReservationId } from '../reservation.js'
import {
  type RatingCategory,
  type Review,
  type ReviewId,
  calculateAverageRating,
  canBeDeleted,
  canBeEdited,
  canBeHidden,
  canBePublished,
  createReviewId,
  createReviewIdSafe,
  getReviewStatus,
  hasAllRatings,
  isDeletedReview,
  isDraftReview,
  isHiddenReview,
  isPublishedReview,
  isVisible,
  sortByMostHelpful,
  sortByMostRecent,
  sortByRating,
  validateComment,
  validateImages,
  validateRating,
} from '../review.js'
import { createSalonId } from '../salon.js'
// Helper function to create ReviewId with null check
const createTestReviewId = (uuid: string): ReviewId => {
  const id = createReviewId(uuid)
  if (!id) {
    throw new Error(`Failed to create ReviewId from UUID: ${uuid}`)
  }
  return id
}

// Helper function to create other IDs
const createTestSalonId = (uuid: string) => {
  const id = createSalonId(uuid)
  if (!id) {
    throw new Error(`Failed to create SalonId from UUID: ${uuid}`)
  }
  return id
}

const createTestCustomerId = (uuid: string) => {
  const id = createCustomerId(uuid)
  if (!id) {
    throw new Error(`Failed to create CustomerId from UUID: ${uuid}`)
  }
  return id
}

const createTestReservationId = (uuid: string) => {
  const id = createReservationId(uuid)
  if (!id) {
    throw new Error(`Failed to create ReservationId from UUID: ${uuid}`)
  }
  return id
}

describe('Review ID作成関数', () => {
  describe('createReviewId', () => {
    it('should create a valid ReviewId', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const reviewId = createReviewId(validUuid)

      // Assert
      expect(reviewId).not.toBeNull()
      if (reviewId) {
        expect(reviewId).toBe(validUuid)
        expect(typeof reviewId).toBe('string')
      }
    })
  })

  describe('createReviewIdSafe', () => {
    it('should create ReviewId for valid UUID', () => {
      // Arrange
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'

      // Act
      const result = createReviewIdSafe(validUuid)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validUuid,
      })
    })

    it('should return error for invalid UUID', () => {
      // Arrange
      const invalidUuid = 'not-a-uuid'

      // Act
      const result = createReviewIdSafe(invalidUuid)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: invalidUuid,
          brand: 'ReviewId',
          message: `Invalid ReviewId format: ${invalidUuid}`,
        },
      })
    })

    it('should return error for empty string', () => {
      // Arrange
      const emptyString = ''

      // Act
      const result = createReviewIdSafe(emptyString)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidFormat',
          value: emptyString,
          brand: 'ReviewId',
          message: `Invalid ReviewId format: ${emptyString}`,
        },
      })
    })
  })
})

describe('評価値バリデーション', () => {
  describe('validateRating', () => {
    it('should accept valid rating', () => {
      // Arrange
      const validRating = 4

      // Act
      const result = validateRating(validRating)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validRating,
      })
    })

    it('should accept minimum valid rating', () => {
      // Arrange
      const minRating = 1

      // Act
      const result = validateRating(minRating)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: minRating,
      })
    })

    it('should accept maximum valid rating', () => {
      // Arrange
      const maxRating = 5

      // Act
      const result = validateRating(maxRating)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxRating,
      })
    })

    it('should reject rating below 1', () => {
      // Arrange
      const lowRating = 0

      // Act
      const result = validateRating(lowRating)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidRating',
          message: 'overall rating must be between 1 and 5',
        },
      })
    })

    it('should reject rating above 5', () => {
      // Arrange
      const highRating = 6

      // Act
      const result = validateRating(highRating)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidRating',
          message: 'overall rating must be between 1 and 5',
        },
      })
    })

    it('should reject non-integer rating', () => {
      // Arrange
      const decimalRating = 3.5

      // Act
      const result = validateRating(decimalRating)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidRating',
          message: 'overall rating must be an integer',
        },
      })
    })

    it('should reject negative rating', () => {
      // Arrange
      const negativeRating = -1

      // Act
      const result = validateRating(negativeRating)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidRating',
          message: 'overall rating must be between 1 and 5',
        },
      })
    })

    it('should include category in error message', () => {
      // Arrange
      const invalidRating = 6
      const category: RatingCategory = 'service'

      // Act
      const result = validateRating(invalidRating, category)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'invalidRating',
          message: 'service rating must be between 1 and 5',
        },
      })
    })
  })
})

describe('コメントバリデーション', () => {
  describe('validateComment', () => {
    it('should accept valid comment', () => {
      // Arrange
      const validComment = 'とても良いサービスでした。また利用したいです。'

      // Act
      const result = validateComment(validComment)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validComment,
      })
    })

    it('should accept undefined comment', () => {
      // Arrange
      const undefinedComment = undefined

      // Act
      const result = validateComment(undefinedComment)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept empty string comment', () => {
      // Arrange
      const emptyComment = ''

      // Act
      const result = validateComment(emptyComment)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept comment at max length', () => {
      // Arrange
      const maxLengthComment = 'a'.repeat(1000)

      // Act
      const result = validateComment(maxLengthComment)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxLengthComment,
      })
    })

    it('should reject comment that is too long', () => {
      // Arrange
      const longComment = 'a'.repeat(1001)

      // Act
      const result = validateComment(longComment)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'commentTooLong',
          message: 'Comment must be 1000 characters or less',
        },
      })
    })
  })
})

describe('画像バリデーション', () => {
  describe('validateImages', () => {
    it('should accept valid images', () => {
      // Arrange
      const validImages = ['image1.jpg', 'image2.jpg', 'image3.jpg']

      // Act
      const result = validateImages(validImages)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: validImages,
      })
    })

    it('should accept undefined images', () => {
      // Arrange
      const undefinedImages = undefined

      // Act
      const result = validateImages(undefinedImages)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept empty images array', () => {
      // Arrange
      const emptyImages: string[] = []

      // Act
      const result = validateImages(emptyImages)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: undefined,
      })
    })

    it('should accept maximum number of images', () => {
      // Arrange
      const maxImages = [
        'img1.jpg',
        'img2.jpg',
        'img3.jpg',
        'img4.jpg',
        'img5.jpg',
      ]

      // Act
      const result = validateImages(maxImages)

      // Assert
      expect(result).toEqual({
        type: 'ok',
        value: maxImages,
      })
    })

    it('should reject too many images', () => {
      // Arrange
      const tooManyImages = [
        'img1.jpg',
        'img2.jpg',
        'img3.jpg',
        'img4.jpg',
        'img5.jpg',
        'img6.jpg',
      ]

      // Act
      const result = validateImages(tooManyImages)

      // Assert
      expect(result).toEqual({
        type: 'err',
        error: {
          type: 'tooManyImages',
          message: 'Maximum 5 images allowed',
        },
      })
    })
  })
})

describe('Review状態判定関数', () => {
  const baseReviewData = {
    id: createTestReviewId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    reservationId: createTestReservationId(
      '880e8400-e29b-41d4-a716-446655440003'
    ),
    rating: 5,
    comment: 'とても良かったです',
    isVerified: true,
    helpfulCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('isDraftReview', () => {
    it('should return true for draft review', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = isDraftReview(draftReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = isDraftReview(publishedReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isPublishedReview', () => {
    it('should return true for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = isPublishedReview(publishedReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for draft review', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = isPublishedReview(draftReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isHiddenReview', () => {
    it('should return true for hidden review', () => {
      // Arrange
      const hiddenReview: Review = {
        type: 'hidden',
        data: baseReviewData,
        hiddenAt: new Date('2024-01-03'),
        hiddenBy: 'admin',
        hiddenReason: '不適切な内容',
      }

      // Act
      const result = isHiddenReview(hiddenReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = isHiddenReview(publishedReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('isDeletedReview', () => {
    it('should return true for deleted review', () => {
      // Arrange
      const deletedReview: Review = {
        type: 'deleted',
        data: baseReviewData,
        deletedAt: new Date('2024-01-04'),
        deletedBy: 'admin',
        deletionReason: 'スパム',
      }

      // Act
      const result = isDeletedReview(deletedReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = isDeletedReview(publishedReview)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Review権限判定関数', () => {
  const baseReviewData = {
    id: createTestReviewId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    reservationId: createTestReservationId(
      '880e8400-e29b-41d4-a716-446655440003'
    ),
    rating: 5,
    isVerified: true,
    helpfulCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('canBePublished', () => {
    it('should return true for draft review', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = canBePublished(draftReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = canBePublished(publishedReview)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for hidden review', () => {
      // Arrange
      const hiddenReview: Review = {
        type: 'hidden',
        data: baseReviewData,
        hiddenAt: new Date('2024-01-03'),
        hiddenBy: 'admin',
        hiddenReason: '不適切な内容',
      }

      // Act
      const result = canBePublished(hiddenReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canBeEdited', () => {
    it('should return true for draft review', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = canBeEdited(draftReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = canBeEdited(publishedReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for hidden review', () => {
      // Arrange
      const hiddenReview: Review = {
        type: 'hidden',
        data: baseReviewData,
        hiddenAt: new Date('2024-01-03'),
        hiddenBy: 'admin',
        hiddenReason: '不適切な内容',
      }

      // Act
      const result = canBeEdited(hiddenReview)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for deleted review', () => {
      // Arrange
      const deletedReview: Review = {
        type: 'deleted',
        data: baseReviewData,
        deletedAt: new Date('2024-01-04'),
        deletedBy: 'admin',
        deletionReason: 'スパム',
      }

      // Act
      const result = canBeEdited(deletedReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canBeHidden', () => {
    it('should return true for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = canBeHidden(publishedReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for draft review', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = canBeHidden(draftReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('canBeDeleted', () => {
    it('should return true for draft review', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = canBeDeleted(draftReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for published review', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = canBeDeleted(publishedReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return true for hidden review', () => {
      // Arrange
      const hiddenReview: Review = {
        type: 'hidden',
        data: baseReviewData,
        hiddenAt: new Date('2024-01-03'),
        hiddenBy: 'admin',
        hiddenReason: '不適切な内容',
      }

      // Act
      const result = canBeDeleted(hiddenReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for deleted review', () => {
      // Arrange
      const deletedReview: Review = {
        type: 'deleted',
        data: baseReviewData,
        deletedAt: new Date('2024-01-04'),
        deletedBy: 'admin',
        deletionReason: 'スパム',
      }

      // Act
      const result = canBeDeleted(deletedReview)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Reviewユーティリティ関数', () => {
  const baseReviewData = {
    id: createTestReviewId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    reservationId: createTestReservationId(
      '880e8400-e29b-41d4-a716-446655440003'
    ),
    rating: 5,
    isVerified: true,
    helpfulCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  describe('getReviewStatus', () => {
    it('should return status for each review type', () => {
      // Arrange
      const reviews: Review[] = [
        { type: 'draft', data: baseReviewData },
        {
          type: 'published',
          data: baseReviewData,
          publishedAt: new Date(),
          publishedBy: 'user',
        },
        {
          type: 'hidden',
          data: baseReviewData,
          hiddenAt: new Date(),
          hiddenBy: 'admin',
          hiddenReason: 'test',
        },
        {
          type: 'deleted',
          data: baseReviewData,
          deletedAt: new Date(),
          deletedBy: 'admin',
          deletionReason: 'test',
        },
      ]

      // Act & Assert
      const review0 = reviews[0]
      const review1 = reviews[1]
      const review2 = reviews[2]
      const review3 = reviews[3]

      expect(review0).toBeDefined()
      expect(review1).toBeDefined()
      expect(review2).toBeDefined()
      expect(review3).toBeDefined()

      if (review0) expect(getReviewStatus(review0)).toBe('draft')
      if (review1) expect(getReviewStatus(review1)).toBe('published')
      if (review2) expect(getReviewStatus(review2)).toBe('hidden')
      if (review3) expect(getReviewStatus(review3)).toBe('deleted')
    })
  })

  describe('isVisible', () => {
    it('should return true only for published reviews', () => {
      // Arrange
      const publishedReview: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user',
      }

      // Act
      const result = isVisible(publishedReview)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false for non-published reviews', () => {
      // Arrange
      const draftReview: Review = {
        type: 'draft',
        data: baseReviewData,
      }

      // Act
      const result = isVisible(draftReview)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('hasAllRatings', () => {
    it('should return true when all ratings are present', () => {
      // Arrange
      const reviewWithAllRatings: Review = {
        type: 'published',
        data: {
          ...baseReviewData,
          serviceRating: 5,
          staffRating: 4,
          atmosphereRating: 5,
        },
        publishedAt: new Date(),
        publishedBy: 'user',
      }

      // Act
      const result = hasAllRatings(reviewWithAllRatings)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when some ratings are missing', () => {
      // Arrange
      const reviewWithPartialRatings: Review = {
        type: 'published',
        data: {
          ...baseReviewData,
          serviceRating: 5,
          // staffRating is missing
          atmosphereRating: 5,
        },
        publishedAt: new Date(),
        publishedBy: 'user',
      }

      // Act
      const result = hasAllRatings(reviewWithPartialRatings)

      // Assert
      expect(result).toBe(false)
    })

    it('should return false when no sub-ratings are present', () => {
      // Arrange
      const reviewWithoutSubRatings: Review = {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date(),
        publishedBy: 'user',
      }

      // Act
      const result = hasAllRatings(reviewWithoutSubRatings)

      // Assert
      expect(result).toBe(false)
    })
  })
})

describe('Review集計関数', () => {
  const createReviewWithRating = (
    rating: number,
    type: Review['type'] = 'published'
  ): Review => {
    const baseData = {
      id: createTestReviewId(`550e8400-e29b-41d4-a716-44665544000${rating}`),
      salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
      customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
      reservationId: createTestReservationId(
        `880e8400-e29b-41d4-a716-44665544000${rating}`
      ),
      rating,
      isVerified: true,
      helpfulCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    }

    switch (type) {
      case 'draft':
        return { type: 'draft', data: baseData }
      case 'published':
        return {
          type: 'published',
          data: baseData,
          publishedAt: new Date(),
          publishedBy: 'user',
        }
      case 'hidden':
        return {
          type: 'hidden',
          data: baseData,
          hiddenAt: new Date(),
          hiddenBy: 'admin',
          hiddenReason: 'test',
        }
      case 'deleted':
        return {
          type: 'deleted',
          data: baseData,
          deletedAt: new Date(),
          deletedBy: 'admin',
          deletionReason: 'test',
        }
    }
  }

  describe('calculateAverageRating', () => {
    it('should calculate average rating for published reviews only', () => {
      // Arrange
      const reviews = [
        createReviewWithRating(5, 'published'),
        createReviewWithRating(4, 'published'),
        createReviewWithRating(3, 'published'),
      ]

      // Act
      const average = calculateAverageRating(reviews)

      // Assert
      expect(average).toBe(4)
    })

    it('should exclude non-published reviews from calculation', () => {
      // Arrange
      const reviews = [
        createReviewWithRating(5, 'published'),
        createReviewWithRating(1, 'draft'),
        createReviewWithRating(1, 'hidden'),
        createReviewWithRating(4, 'published'),
      ]

      // Act
      const average = calculateAverageRating(reviews)

      // Assert
      expect(average).toBe(4.5)
    })

    it('should return 0 when no published reviews', () => {
      // Arrange
      const reviews = [
        createReviewWithRating(5, 'draft'),
        createReviewWithRating(4, 'hidden'),
      ]

      // Act
      const average = calculateAverageRating(reviews)

      // Assert
      expect(average).toBe(0)
    })

    it('should round to one decimal place', () => {
      // Arrange
      const reviews = [
        createReviewWithRating(5, 'published'),
        createReviewWithRating(4, 'published'),
        createReviewWithRating(4, 'published'),
      ]

      // Act
      const average = calculateAverageRating(reviews)

      // Assert
      expect(average).toBe(4.3)
    })
  })
})

describe('Reviewソート関数', () => {
  const createReviewForSort = (
    createdAt: Date,
    helpfulCount: number,
    rating: number
  ): Review => {
    return {
      type: 'published',
      data: {
        id: createTestReviewId(`550e8400-e29b-41d4-a716-44665544000${rating}`),
        salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
        customerId: createTestCustomerId(
          '770e8400-e29b-41d4-a716-446655440002'
        ),
        reservationId: createTestReservationId(
          `880e8400-e29b-41d4-a716-44665544000${rating}`
        ),
        rating,
        isVerified: true,
        helpfulCount,
        createdAt,
        updatedAt: createdAt,
      },
      publishedAt: createdAt,
      publishedBy: 'user',
    }
  }

  describe('sortByMostRecent', () => {
    it('should sort reviews by creation date descending', () => {
      // Arrange
      const reviews = [
        createReviewForSort(new Date('2024-01-01'), 0, 5),
        createReviewForSort(new Date('2024-01-03'), 0, 3),
        createReviewForSort(new Date('2024-01-02'), 0, 4),
      ]

      // Act
      const sorted = sortByMostRecent(reviews)

      // Assert
      const sorted0 = sorted[0]
      const sorted1 = sorted[1]
      const sorted2 = sorted[2]

      expect(sorted0).toBeDefined()
      expect(sorted1).toBeDefined()
      expect(sorted2).toBeDefined()

      if (sorted0)
        expect(sorted0.data.createdAt).toEqual(new Date('2024-01-03'))
      if (sorted1)
        expect(sorted1.data.createdAt).toEqual(new Date('2024-01-02'))
      if (sorted2)
        expect(sorted2.data.createdAt).toEqual(new Date('2024-01-01'))
    })

    it('should not modify original array', () => {
      // Arrange
      const reviews = [
        createReviewForSort(new Date('2024-01-01'), 0, 5),
        createReviewForSort(new Date('2024-01-03'), 0, 3),
      ]
      const originalFirst = reviews[0]

      // Act
      sortByMostRecent(reviews)

      // Assert
      const firstReview = reviews[0]
      expect(firstReview).toBeDefined()
      if (firstReview) expect(firstReview).toBe(originalFirst)
    })
  })

  describe('sortByMostHelpful', () => {
    it('should sort reviews by helpful count descending', () => {
      // Arrange
      const reviews = [
        createReviewForSort(new Date('2024-01-01'), 5, 3),
        createReviewForSort(new Date('2024-01-01'), 10, 4),
        createReviewForSort(new Date('2024-01-01'), 3, 5),
      ]

      // Act
      const sorted = sortByMostHelpful(reviews)

      // Assert
      const sorted0 = sorted[0]
      const sorted1 = sorted[1]
      const sorted2 = sorted[2]

      expect(sorted0).toBeDefined()
      expect(sorted1).toBeDefined()
      expect(sorted2).toBeDefined()

      if (sorted0) expect(sorted0.data.helpfulCount).toBe(10)
      if (sorted1) expect(sorted1.data.helpfulCount).toBe(5)
      if (sorted2) expect(sorted2.data.helpfulCount).toBe(3)
    })
  })

  describe('sortByRating', () => {
    it('should sort reviews by rating descending by default', () => {
      // Arrange
      const reviews = [
        createReviewForSort(new Date('2024-01-01'), 0, 3),
        createReviewForSort(new Date('2024-01-01'), 0, 5),
        createReviewForSort(new Date('2024-01-01'), 0, 4),
      ]

      // Act
      const sorted = sortByRating(reviews)

      // Assert
      const sorted0 = sorted[0]
      const sorted1 = sorted[1]
      const sorted2 = sorted[2]

      expect(sorted0).toBeDefined()
      expect(sorted1).toBeDefined()
      expect(sorted2).toBeDefined()

      if (sorted0) expect(sorted0.data.rating).toBe(5)
      if (sorted1) expect(sorted1.data.rating).toBe(4)
      if (sorted2) expect(sorted2.data.rating).toBe(3)
    })

    it('should sort reviews by rating ascending when specified', () => {
      // Arrange
      const reviews = [
        createReviewForSort(new Date('2024-01-01'), 0, 3),
        createReviewForSort(new Date('2024-01-01'), 0, 5),
        createReviewForSort(new Date('2024-01-01'), 0, 4),
      ]

      // Act
      const sorted = sortByRating(reviews, false)

      // Assert
      const sorted0 = sorted[0]
      const sorted1 = sorted[1]
      const sorted2 = sorted[2]

      expect(sorted0).toBeDefined()
      expect(sorted1).toBeDefined()
      expect(sorted2).toBeDefined()

      if (sorted0) expect(sorted0.data.rating).toBe(3)
      if (sorted1) expect(sorted1.data.rating).toBe(4)
      if (sorted2) expect(sorted2.data.rating).toBe(5)
    })
  })
})

describe('Review Sum型のパターンマッチング', () => {
  const baseReviewData = {
    id: createTestReviewId('550e8400-e29b-41d4-a716-446655440000'),
    salonId: createTestSalonId('660e8400-e29b-41d4-a716-446655440001'),
    customerId: createTestCustomerId('770e8400-e29b-41d4-a716-446655440002'),
    reservationId: createTestReservationId(
      '880e8400-e29b-41d4-a716-446655440003'
    ),
    rating: 5,
    comment: 'とても良かったです',
    isVerified: true,
    helpfulCount: 10,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  }

  it('should handle all review states with pattern matching', () => {
    // Arrange
    const reviewStates: Review[] = [
      {
        type: 'draft',
        data: baseReviewData,
      },
      {
        type: 'published',
        data: baseReviewData,
        publishedAt: new Date('2024-01-02'),
        publishedBy: 'user123',
      },
      {
        type: 'hidden',
        data: baseReviewData,
        hiddenAt: new Date('2024-01-03'),
        hiddenBy: 'admin',
        hiddenReason: '不適切な内容',
      },
      {
        type: 'deleted',
        data: baseReviewData,
        deletedAt: new Date('2024-01-04'),
        deletedBy: 'admin',
        deletionReason: 'スパム投稿',
      },
    ]

    // Act & Assert
    for (const review of reviewStates) {
      const status = match(review)
        .with({ type: 'draft' }, () => '下書き')
        .with(
          { type: 'published' },
          ({ publishedBy }) => `公開済み（${publishedBy}が公開）`
        )
        .with(
          { type: 'hidden' },
          ({ hiddenReason }) => `非表示: ${hiddenReason}`
        )
        .with(
          { type: 'deleted' },
          ({ deletionReason }) => `削除済み: ${deletionReason}`
        )
        .exhaustive()

      // Assert
      expect(status).toBeDefined()
      expect(typeof status).toBe('string')
    }
  })
})
