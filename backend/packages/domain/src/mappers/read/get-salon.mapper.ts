/**
 * Get Salon Mapper (Read Operation)
 * Database Entity -> Domain Model -> API Response
 */

import type { salons } from '@beauty-salon-backend/database'
import type { components } from '@beauty-salon-backend/generated'
import type { Salon, SalonId } from '../../models/salon'
import type { Result } from '../../shared/result'
import { err, ok } from '../../shared/result'

// ============================================================================
// Type Definitions
// ============================================================================

type SalonDb = typeof salons.$inferSelect
type SalonApiResponse = components['schemas']['Models.Salon']
type SalonSummaryApiResponse = components['schemas']['Models.SalonSummary']

// ============================================================================
// Database to Domain Mapping
// ============================================================================

export const mapGetSalonDbToDomain = (
  dbSalon: SalonDb
): Result<Salon, string> => {
  if (!dbSalon) {
    return err('Salon not found in database')
  }

  try {
    // Map database entity to domain model
    const domainSalon: Salon = {
      id: dbSalon.id as SalonId,
      name: dbSalon.name,
      description: dbSalon.description || '',
      address: {
        street: dbSalon.address,
        city: dbSalon.city,
        state: dbSalon.prefecture,
        postalCode: dbSalon.postalCode || '',
        country: 'Japan',
      },
      contactInfo: {
        email: dbSalon.email,
        phoneNumber: dbSalon.phoneNumber,
        alternativePhone: dbSalon.alternativePhone || undefined,
      },
      openingHours: [], // TODO: Add openingHours to database schema
      // businessHours is optional and not in database yet
      imageUrls: Array.isArray(dbSalon.imageUrls)
        ? (dbSalon.imageUrls as string[])
        : undefined,
      features: Array.isArray(dbSalon.features)
        ? (dbSalon.features as string[])
        : undefined,
      createdAt: dbSalon.createdAt,
      createdBy: undefined, // Not tracked in current DB schema
      updatedAt: dbSalon.updatedAt,
      updatedBy: undefined, // Not tracked in current DB schema
    }

    return ok(domainSalon)
  } catch (error) {
    return err(`Failed to map database entity to domain: ${error}`)
  }
}

// ============================================================================
// Domain to API Mapping
// ============================================================================

export const mapGetSalonDomainToApi = (
  domain: Salon
): Result<SalonApiResponse, string> => {
  try {
    // Map domain model to API response
    const apiResponse: SalonApiResponse = {
      id: domain.id,
      name: domain.name,
      description: domain.description,
      address: domain.address,
      contactInfo: domain.contactInfo,
      openingHours: domain.openingHours,
      // businessHours not included in API response yet
      imageUrls: domain.imageUrls,
      features: domain.features,
      createdAt: domain.createdAt,
      createdBy: domain.createdBy,
      updatedAt: domain.updatedAt,
      updatedBy: domain.updatedBy,
    }

    return ok(apiResponse)
  } catch (error) {
    return err(`Failed to map domain to API response: ${error}`)
  }
}

// ============================================================================
// Domain to Summary Mapping
// ============================================================================

export const mapSalonDomainToSummary = (
  domain: Salon,
  stats?: {
    rating?: number
    reviewCount?: number
  }
): Result<SalonSummaryApiResponse, string> => {
  try {
    const summary: SalonSummaryApiResponse = {
      id: domain.id,
      name: domain.name,
      address: domain.address,
      rating: stats?.rating,
      reviewCount: stats?.reviewCount,
    }

    return ok(summary)
  } catch (error) {
    return err(`Failed to create salon summary: ${error}`)
  }
}

// ============================================================================
// Complete Read Flow
// ============================================================================

export const getSalonReadFlow = (
  dbSalon: SalonDb
): Result<SalonApiResponse, string> => {
  // Step 1: Database to Domain
  const domainResult = mapGetSalonDbToDomain(dbSalon)
  if (domainResult.type === 'err') {
    return err(domainResult.error)
  }

  // Step 2: Domain to API
  return mapGetSalonDomainToApi(domainResult.value)
}

export const getSalonSummaryReadFlow = (
  dbSalon: SalonDb,
  stats?: {
    rating?: number
    reviewCount?: number
  }
): Result<SalonSummaryApiResponse, string> => {
  // Step 1: Database to Domain
  const domainResult = mapGetSalonDbToDomain(dbSalon)
  if (domainResult.type === 'err') {
    return err(domainResult.error)
  }

  // Step 2: Create Summary
  return mapSalonDomainToSummary(domainResult.value, stats)
}

// ============================================================================
// Helper Functions
// ============================================================================

export const isSalonActive = (dbSalon: SalonDb): boolean => {
  return dbSalon.isActive && !dbSalon.deletedAt
}

export const hasCompleteContactInfo = (dbSalon: SalonDb): boolean => {
  return Boolean(dbSalon.email && dbSalon.phoneNumber)
}

export const formatOpeningHours = (
  hours: components['schemas']['Models.OpeningHours'][]
): string => {
  const daysOrder = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]

  const sortedHours = [...hours].sort((a, b) => {
    const dayA = daysOrder.indexOf(a.dayOfWeek.toLowerCase())
    const dayB = daysOrder.indexOf(b.dayOfWeek.toLowerCase())
    return dayA - dayB
  })

  return sortedHours
    .map((h) => `${h.dayOfWeek}: ${h.openTime} - ${h.closeTime}`)
    .join('\n')
}

export const calculateOperatingHours = (
  openingHours: components['schemas']['Models.OpeningHours'][]
): number => {
  return openingHours.reduce((total, hours) => {
    const [openHour, openMin] = hours.openTime.split(':').map(Number)
    const [closeHour, closeMin] = hours.closeTime.split(':').map(Number)

    const openMinutes = (openHour ?? 0) * 60 + (openMin ?? 0)
    const closeMinutes = (closeHour ?? 0) * 60 + (closeMin ?? 0)

    return total + (closeMinutes - openMinutes) / 60
  }, 0)
}
