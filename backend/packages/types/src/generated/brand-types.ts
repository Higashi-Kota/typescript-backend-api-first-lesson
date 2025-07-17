// Generated from TypeSpec/OpenAPI
// DO NOT EDIT MANUALLY

export const brand = Symbol('brand');
export type Brand<T, B> = T & { [brand]: B };

export type BookingId = Brand<string, 'BookingId'>;
export type CategoryId = Brand<string, 'CategoryId'>;
export type CustomerId = Brand<string, 'CustomerId'>;
export type ReservationId = Brand<string, 'ReservationId'>;
export type ReviewId = Brand<string, 'ReviewId'>;
export type SalonId = Brand<string, 'SalonId'>;
export type ServiceId = Brand<string, 'ServiceId'>;
export type StaffId = Brand<string, 'StaffId'>;

// Brand type creators
export const createBookingId = (value: string): BookingId => value as BookingId;
export const createCategoryId = (value: string): CategoryId => value as CategoryId;
export const createCustomerId = (value: string): CustomerId => value as CustomerId;
export const createReservationId = (value: string): ReservationId => value as ReservationId;
export const createReviewId = (value: string): ReviewId => value as ReviewId;
export const createSalonId = (value: string): SalonId => value as SalonId;
export const createServiceId = (value: string): ServiceId => value as ServiceId;
export const createStaffId = (value: string): StaffId => value as StaffId;