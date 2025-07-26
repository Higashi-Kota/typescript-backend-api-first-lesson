/**
 * 共通エラー型定義
 */

// リポジトリエラー
export type RepositoryError =
  | { type: 'notFound'; entity: string; id: string }
  | { type: 'databaseError'; message: string }
  | { type: 'connectionError'; message: string }
  | { type: 'constraintViolation'; constraint: string; message: string }
  // Review specific errors
  | { type: 'invalidRating'; message: string }
  | { type: 'duplicateReview'; message: string }
  | { type: 'reviewAlreadyHidden'; message: string }
  | { type: 'reviewUpdateExpired'; message: string }
  | { type: 'reservationNotFound'; message: string }
  // Reservation specific errors
  | { type: 'invalidTimeRange'; message: string }
  | { type: 'slotNotAvailable'; message: string }
  | { type: 'reservationNotModifiable'; message: string }
  | { type: 'reservationAlreadyConfirmed'; message: string }
  | { type: 'invalidReservationStatus'; message: string }
  | { type: 'reservationAlreadyCancelled'; message: string }
  | { type: 'reservationNotConfirmed'; message: string }
  | { type: 'reservationNotYetPassed'; message: string }
