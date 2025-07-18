/**
 * Get Salon Use Cases
 * サロン取得のビジネスロジック
 * CLAUDEガイドラインに準拠した実装
 */

import type {
  PaginatedResult,
  PaginationParams,
  RepositoryError,
  Result,
  Salon,
  SalonId,
  SalonRepository,
  SalonSearchCriteria,
} from '@beauty-salon-backend/domain'
import { createSalonIdSafe, err } from '@beauty-salon-backend/domain'
import type { components } from '@beauty-salon-backend/types/api'

// UseCase エラー型
export type GetSalonUseCaseError = RepositoryError

// 個別サロン取得
export type GetSalonByIdInput = {
  id: SalonId
}

export type GetSalonByIdOutput = Result<Salon, GetSalonUseCaseError>

export type GetSalonByIdDeps = {
  salonRepository: SalonRepository
}

export const getSalonByIdUseCase = async (
  input: GetSalonByIdInput,
  deps: GetSalonByIdDeps
): Promise<GetSalonByIdOutput> => {
  return deps.salonRepository.findById(input.id)
}

// サロン一覧取得
export type ListSalonsInput = {
  keyword?: string
  city?: string
  isActive?: boolean
  limit: number
  offset: number
}

export type ListSalonsOutput = Result<
  PaginatedResult<Salon>,
  GetSalonUseCaseError
>

export type ListSalonsDeps = {
  salonRepository: SalonRepository
}

export const listSalonsUseCase = async (
  input: ListSalonsInput,
  deps: ListSalonsDeps
): Promise<ListSalonsOutput> => {
  const criteria: SalonSearchCriteria = {
    keyword: input.keyword,
    city: input.city,
    isActive: input.isActive,
  }

  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.salonRepository.search(criteria, pagination)
}

// アクティブなサロン一覧取得
export type ListActiveSalonsInput = {
  limit: number
  offset: number
}

export type ListActiveSalonsOutput = Result<
  PaginatedResult<Salon>,
  GetSalonUseCaseError
>

export type ListActiveSalonsDeps = {
  salonRepository: SalonRepository
}

export const listActiveSalonsUseCase = async (
  input: ListActiveSalonsInput,
  deps: ListActiveSalonsDeps
): Promise<ListActiveSalonsOutput> => {
  const pagination: PaginationParams = {
    limit: input.limit,
    offset: input.offset,
  }

  return deps.salonRepository.findAllActive(pagination)
}

// 都市別サロン数取得
export type CountSalonsByCityOutput = Result<
  Map<string, number>,
  GetSalonUseCaseError
>

export type CountSalonsByCityDeps = {
  salonRepository: SalonRepository
}

export const countSalonsByCityUseCase = async (
  deps: CountSalonsByCityDeps
): Promise<CountSalonsByCityOutput> => {
  return deps.salonRepository.countByCity()
}

/**
 * IDパラメータからUseCaseInputへの変換
 */
export const mapGetSalonByIdRequest = (
  id: string
): Result<GetSalonByIdInput, { type: 'invalidId'; message: string }> => {
  const salonIdResult = createSalonIdSafe(id)
  if (salonIdResult.type === 'err') {
    return err({
      type: 'invalidId',
      message: salonIdResult.error.message,
    })
  }
  return {
    type: 'ok',
    value: {
      id: salonIdResult.value,
    },
  }
}

/**
 * Salon一覧レスポンスへの変換
 */
export const mapSalonListToResponse = (
  result: PaginatedResult<Salon>
): components['schemas']['Models.PaginationResponseModelsSalonSummary'] => {
  return {
    data: result.data.map((salon) => mapSalonToSummaryResponse(salon)),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  }
}

/**
 * SalonからSalonSummaryレスポンスへの変換
 */
export const mapSalonToSummaryResponse = (
  salon: Salon
): components['schemas']['Models.SalonSummary'] => {
  const { data } = salon

  return {
    id: data.id,
    name: data.name,
    address: data.address,
    rating: data.rating,
    reviewCount: data.reviewCount,
  }
}

// Re-export mapSalonToResponse
export { mapSalonToResponse } from './create-salon.usecase.js'
