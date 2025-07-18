/**
 * Get Review Use Cases
 * レビュー取得のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  CustomerId,
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  ReservationId,
  Result,
  Review,
  ReviewDetail,
  ReviewId,
  ReviewRepository,
  ReviewSearchCriteria,
  ReviewStatus,
  ReviewSummary,
  SalonId,
  StaffId,
} from '@beauty-salon-backend/domain'
import {
  createCustomerIdSafe,
  createReservationIdSafe,
  createReviewIdSafe,
  createSalonIdSafe,
  createStaffIdSafe,
} from '@beauty-salon-backend/domain'
import { err, ok } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'
import { mapReviewToResponse } from './create-review.usecase.js'

// UseCase エラー型
export type GetReviewUseCaseError = RepositoryError

// 個別レビュー取得
export type GetReviewByIdInput = {
  id: ReviewId
}

export type GetReviewByIdOutput = Result<Review, GetReviewUseCaseError>

export type GetReviewByIdDeps = {
  reviewRepository: ReviewRepository
}

export const getReviewByIdUseCase = async (
  input: GetReviewByIdInput,
  deps: GetReviewByIdDeps
): Promise<GetReviewByIdOutput> => {
  return deps.reviewRepository.findById(input.id)
}

// レビュー詳細取得
export type GetReviewDetailByIdInput = {
  id: ReviewId
}

export type GetReviewDetailByIdOutput = Result<
  ReviewDetail,
  GetReviewUseCaseError
>

export type GetReviewDetailByIdDeps = {
  reviewRepository: ReviewRepository
}

export const getReviewDetailByIdUseCase = async (
  input: GetReviewDetailByIdInput,
  deps: GetReviewDetailByIdDeps
): Promise<GetReviewDetailByIdOutput> => {
  return deps.reviewRepository.findDetailById(input.id)
}

// レビュー一覧取得
export type ListReviewsInput = {
  salonId?: SalonId
  customerId?: CustomerId
  staffId?: StaffId
  reservationId?: ReservationId
  status?: ReviewStatus
  isVerified?: boolean
  minRating?: number
  maxRating?: number
  startDate?: Date
  endDate?: Date
  limit: number
  offset: number
}

export type ListReviewsOutput = Result<
  PaginatedResult<Review>,
  GetReviewUseCaseError
>

export type ListReviewsDeps = {
  reviewRepository: ReviewRepository
}

export const listReviewsUseCase = async (
  input: ListReviewsInput,
  deps: ListReviewsDeps
): Promise<ListReviewsOutput> => {
  const criteria: ReviewSearchCriteria = {
    salonId: input.salonId,
    customerId: input.customerId,
    staffId: input.staffId,
    reservationId: input.reservationId,
    status: input.status,
    isVerified: input.isVerified,
    minRating: input.minRating,
    maxRating: input.maxRating,
    startDate: input.startDate,
    endDate: input.endDate,
  }

  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.reviewRepository.search(criteria, pagination)
}

// サロンのレビュー取得
export type GetSalonReviewsInput = {
  salonId: SalonId
  limit: number
  offset: number
}

export type GetSalonReviewsOutput = Result<
  PaginatedResult<Review>,
  GetReviewUseCaseError
>

export type GetSalonReviewsDeps = {
  reviewRepository: ReviewRepository
}

export const getSalonReviewsUseCase = async (
  input: GetSalonReviewsInput,
  deps: GetSalonReviewsDeps
): Promise<GetSalonReviewsOutput> => {
  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.reviewRepository.findBySalon(input.salonId, pagination)
}

// サロンのレビューサマリー取得
export type GetSalonReviewSummaryInput = {
  salonId: SalonId
}

export type GetSalonReviewSummaryOutput = Result<
  ReviewSummary,
  GetReviewUseCaseError
>

export type GetSalonReviewSummaryDeps = {
  reviewRepository: ReviewRepository
}

export const getSalonReviewSummaryUseCase = async (
  input: GetSalonReviewSummaryInput,
  deps: GetSalonReviewSummaryDeps
): Promise<GetSalonReviewSummaryOutput> => {
  return deps.reviewRepository.getSalonSummary(input.salonId)
}

// 最新レビュー取得
export type GetRecentReviewsInput = {
  salonId: SalonId
  limit: number
}

export type GetRecentReviewsOutput = Result<Review[], GetReviewUseCaseError>

export type GetRecentReviewsDeps = {
  reviewRepository: ReviewRepository
}

export const getRecentReviewsUseCase = async (
  input: GetRecentReviewsInput,
  deps: GetRecentReviewsDeps
): Promise<GetRecentReviewsOutput> => {
  return deps.reviewRepository.findRecent(input.salonId, input.limit)
}

/**
 * パラメータからUseCaseInputへの変換
 */
export const mapGetReviewByIdRequest = (
  id: string
): Result<GetReviewByIdInput, { type: 'invalidId'; message: string }> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
  })
}

export const mapGetReviewDetailByIdRequest = (
  id: string
): Result<GetReviewDetailByIdInput, { type: 'invalidId'; message: string }> => {
  const reviewIdResult = createReviewIdSafe(id)
  if (reviewIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: reviewIdResult.error.message,
    })
  }
  return ok({
    id: reviewIdResult.value,
  })
}

export const mapListReviewsRequest = (params: {
  salonId?: string
  customerId?: string
  staffId?: string
  reservationId?: string
  status?: ReviewStatus
  isVerified?: boolean
  minRating?: number
  maxRating?: number
  startDate?: Date
  endDate?: Date
  limit: number
  offset: number
}): Result<ListReviewsInput, { type: 'invalidId'; message: string }> => {
  const input: ListReviewsInput = {
    status: params.status,
    isVerified: params.isVerified,
    minRating: params.minRating,
    maxRating: params.maxRating,
    startDate: params.startDate,
    endDate: params.endDate,
    limit: params.limit,
    offset: params.offset,
  }

  if (params.salonId) {
    const salonIdResult = createSalonIdSafe(params.salonId)
    if (salonIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid salon ID: ${salonIdResult.error.message}`,
      })
    }
    input.salonId = salonIdResult.value
  }

  if (params.customerId) {
    const customerIdResult = createCustomerIdSafe(params.customerId)
    if (customerIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid customer ID: ${customerIdResult.error.message}`,
      })
    }
    input.customerId = customerIdResult.value
  }

  if (params.staffId) {
    const staffIdResult = createStaffIdSafe(params.staffId)
    if (staffIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid staff ID: ${staffIdResult.error.message}`,
      })
    }
    input.staffId = staffIdResult.value
  }

  if (params.reservationId) {
    const reservationIdResult = createReservationIdSafe(params.reservationId)
    if (reservationIdResult.type === 'err') {
      return err({
        type: 'invalidId',
        message: `Invalid reservation ID: ${reservationIdResult.error.message}`,
      })
    }
    input.reservationId = reservationIdResult.value
  }

  return ok(input)
}

export const mapGetSalonReviewsRequest = (
  salonId: string,
  limit: number,
  offset: number
): Result<GetSalonReviewsInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(salonId)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    salonId: salonIdResult.value,
    limit,
    offset,
  })
}

export const mapGetSalonReviewSummaryRequest = (
  salonId: string
): Result<
  GetSalonReviewSummaryInput,
  { type: 'invalidId'; message: string }
> => {
  const salonIdResult = createSalonIdSafe(salonId)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    salonId: salonIdResult.value,
  })
}

export const mapGetRecentReviewsRequest = (
  salonId: string,
  limit: number
): Result<GetRecentReviewsInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(salonId)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return ok({
    salonId: salonIdResult.value,
    limit,
  })
}

/**
 * レビュー詳細レスポンスへの変換
 */
export const mapReviewDetailToResponse = (
  detail: ReviewDetail
): components['schemas']['Models.ReviewDetail'] => {
  const base = mapReviewToResponse(detail.review)

  return {
    ...base,
    customerName: detail.customerName,
    salonName: detail.salonName,
    staffName: detail.staffName,
    serviceName: detail.serviceName,
    reservationDate: detail.reservationDate.toISOString(),
  }
}

/**
 * レビュー一覧レスポンスへの変換
 */
export const mapReviewListToResponse = (
  result: PaginatedResult<Review>
): components['schemas']['Models.PaginationResponseModelsReview'] => {
  return {
    data: result.data.map(mapReviewToResponse),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }
}

/**
 * レビューサマリーレスポンスへの変換
 */
export const mapReviewSummaryToResponse = (
  summary: ReviewSummary
): components['schemas']['Models.ReviewSummary'] => {
  // 評価分布をオブジェクトに変換
  const ratingDistribution: { [key: string]: number } = {}
  summary.ratingDistribution.forEach((count, rating) => {
    ratingDistribution[rating.toString()] = count
  })

  return {
    salonId: summary.salonId,
    totalReviews: summary.totalReviews,
    averageRating: summary.averageRating,
    averageServiceRating: summary.averageServiceRating,
    averageStaffRating: summary.averageStaffRating,
    averageAtmosphereRating: summary.averageAtmosphereRating,
    ratingDistribution,
  }
}
