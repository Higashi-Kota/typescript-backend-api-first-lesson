import type { Brand } from './api-types';

// Brand type creators
export type BookingId = Brand<string, 'BookingId'>;
export const createBookingId = (value: string): BookingId => value as BookingId;

export type CategoryId = Brand<string, 'CategoryId'>;
export const createCategoryId = (value: string): CategoryId => value as CategoryId;

export type CustomerId = Brand<string, 'CustomerId'>;
export const createCustomerId = (value: string): CustomerId => value as CustomerId;

export type ReservationId = Brand<string, 'ReservationId'>;
export const createReservationId = (value: string): ReservationId => value as ReservationId;

export type ReviewId = Brand<string, 'ReviewId'>;
export const createReviewId = (value: string): ReviewId => value as ReviewId;

export type SalonId = Brand<string, 'SalonId'>;
export const createSalonId = (value: string): SalonId => value as SalonId;

export type ServiceId = Brand<string, 'ServiceId'>;
export const createServiceId = (value: string): ServiceId => value as ServiceId;

export type StaffId = Brand<string, 'StaffId'>;
export const createStaffId = (value: string): StaffId => value as StaffId;

