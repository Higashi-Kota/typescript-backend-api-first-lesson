import { z } from 'zod';

export const BookingStatusSchema = z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const DayOfWeekSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;

export const FileTypeSchema = z.enum(['image', 'document', 'other']);
export type FileType = z.infer<typeof FileTypeSchema>;

export const ReservationStatusSchema = z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const ServiceCategorySchema = z.enum(['cut', 'color', 'perm', 'treatment', 'spa', 'other']);
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

export const TwoFactorStatusSchema = z.enum(['disabled', 'pending', 'enabled']);
export type TwoFactorStatus = z.infer<typeof TwoFactorStatusSchema>;

export const UserAccountStatusSchema = z.enum(['active', 'unverified', 'locked', 'suspended', 'deleted']);
export type UserAccountStatus = z.infer<typeof UserAccountStatusSchema>;

export const UserRoleSchema = z.enum(['customer', 'staff', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

