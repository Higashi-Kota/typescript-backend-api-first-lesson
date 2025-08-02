import { z } from 'zod';
import type { Brand } from './api-types';

// UUID validation
const isValidUuid = (val: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
};

export const BookingIdSchema = z.string().refine(
  (val): val is Brand<string, 'BookingId'> => isValidUuid(val),
  { message: 'Invalid BookingId format' }
);

export const BookingStatusSchema = z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const CategoryIdSchema = z.string().refine(
  (val): val is Brand<string, 'CategoryId'> => isValidUuid(val),
  { message: 'Invalid CategoryId format' }
);

export const CustomerIdSchema = z.string().refine(
  (val): val is Brand<string, 'CustomerId'> => isValidUuid(val),
  { message: 'Invalid CustomerId format' }
);

export const DayOfWeekSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const FileTypeSchema = z.enum(['image', 'document', 'other']);
export type FileType = z.infer<typeof FileTypeSchema>;

export const ReservationIdSchema = z.string().refine(
  (val): val is Brand<string, 'ReservationId'> => isValidUuid(val),
  { message: 'Invalid ReservationId format' }
);

export const ReservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const ReviewIdSchema = z.string().refine(
  (val): val is Brand<string, 'ReviewId'> => isValidUuid(val),
  { message: 'Invalid ReviewId format' }
);

export const SalonIdSchema = z.string().refine(
  (val): val is Brand<string, 'SalonId'> => isValidUuid(val),
  { message: 'Invalid SalonId format' }
);

export const ServiceCategorySchema = z.enum(['cut', 'color', 'perm', 'treatment', 'spa', 'other']);
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

export const ServiceIdSchema = z.string().refine(
  (val): val is Brand<string, 'ServiceId'> => isValidUuid(val),
  { message: 'Invalid ServiceId format' }
);

export const StaffIdSchema = z.string().refine(
  (val): val is Brand<string, 'StaffId'> => isValidUuid(val),
  { message: 'Invalid StaffId format' }
);

export const TwoFactorStatusSchema = z.enum(['disabled', 'pending', 'enabled']);
export type TwoFactorStatus = z.infer<typeof TwoFactorStatusSchema>;

export const UserAccountStatusSchema = z.enum(['active', 'unverified', 'locked', 'suspended', 'deleted']);
export type UserAccountStatus = z.infer<typeof UserAccountStatusSchema>;

export const UserRoleSchema = z.enum(['customer', 'staff', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

