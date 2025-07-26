/**
 * Error mapping utilities for UseCase layer
 */

import type { RepositoryError } from '@beauty-salon-backend/domain'
import { match } from 'ts-pattern'

export const mapRepositoryError = (
  error: RepositoryError
): { code: string; message: string } => {
  return (
    match(error)
      .with({ type: 'databaseError' }, (e) => ({
        code: 'DATABASE_ERROR',
        message: e.message,
      }))
      .with({ type: 'notFound' }, (e) => ({
        code: 'NOT_FOUND',
        message: `Entity ${e.entity} not found with id ${e.id}`,
      }))
      .with({ type: 'constraintViolation' }, (e) => ({
        code: 'CONSTRAINT_VIOLATION',
        message: e.message,
      }))
      .with({ type: 'connectionError' }, (e) => ({
        code: 'CONNECTION_ERROR',
        message: e.message,
      }))
      // Review specific errors
      .with({ type: 'invalidRating' }, (e) => ({
        code: 'INVALID_RATING',
        message: e.message,
      }))
      .with({ type: 'duplicateReview' }, (e) => ({
        code: 'DUPLICATE_REVIEW',
        message: e.message,
      }))
      .with({ type: 'reviewAlreadyHidden' }, (e) => ({
        code: 'REVIEW_ALREADY_HIDDEN',
        message: e.message,
      }))
      .with({ type: 'reviewUpdateExpired' }, (e) => ({
        code: 'REVIEW_UPDATE_EXPIRED',
        message: e.message,
      }))
      .with({ type: 'reservationNotFound' }, (e) => ({
        code: 'RESERVATION_NOT_FOUND',
        message: e.message,
      }))
      // Reservation specific errors
      .with({ type: 'invalidTimeRange' }, (e) => ({
        code: 'INVALID_TIME_RANGE',
        message: e.message,
      }))
      .with({ type: 'slotNotAvailable' }, (e) => ({
        code: 'SLOT_NOT_AVAILABLE',
        message: e.message,
      }))
      .with({ type: 'reservationNotModifiable' }, (e) => ({
        code: 'RESERVATION_NOT_MODIFIABLE',
        message: e.message,
      }))
      .with({ type: 'reservationAlreadyConfirmed' }, (e) => ({
        code: 'RESERVATION_ALREADY_CONFIRMED',
        message: e.message,
      }))
      .with({ type: 'invalidReservationStatus' }, (e) => ({
        code: 'INVALID_RESERVATION_STATUS',
        message: e.message,
      }))
      .with({ type: 'reservationAlreadyCancelled' }, (e) => ({
        code: 'RESERVATION_ALREADY_CANCELLED',
        message: e.message,
      }))
      .with({ type: 'reservationNotConfirmed' }, (e) => ({
        code: 'RESERVATION_NOT_CONFIRMED',
        message: e.message,
      }))
      .with({ type: 'reservationNotYetPassed' }, (e) => ({
        code: 'RESERVATION_NOT_YET_PASSED',
        message: e.message,
      }))
      .exhaustive()
  )
}
