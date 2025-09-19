import { z } from 'zod'

export const AllergySeveritySchema = z.enum(['mild', 'moderate', 'severe'])
export type AllergySeverity = z.infer<typeof AllergySeveritySchema>

export const AllergyTypeSchema = z.enum([
  'chemical',
  'fragrance',
  'metal',
  'latex',
  'plant',
  'other',
])
export type AllergyType = z.infer<typeof AllergyTypeSchema>

export const AuthUserRoleSchema = z.enum(['customer', 'staff', 'admin'])
export type AuthUserRole = z.infer<typeof AuthUserRoleSchema>

export const AuthenticationStateTypeSchema = z.enum([
  'unauthenticated',
  'authenticated',
  'pending_two_factor',
  'locked',
])
export type AuthenticationStateType = z.infer<
  typeof AuthenticationStateTypeSchema
>

export const BookingRequirementTypeSchema = z.enum([
  'deposit',
  'consultation',
  'patch_test',
  'age_restriction',
  'gender_restriction',
  'membership',
  'preparation',
])
export type BookingRequirementType = z.infer<
  typeof BookingRequirementTypeSchema
>

export const BookingStatusCodeSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])
export type BookingStatusCode = z.infer<typeof BookingStatusCodeSchema>

export const ColorSubCategorySchema = z.enum([
  'full_color',
  'root_touch',
  'highlights',
  'lowlights',
  'balayage',
  'ombre',
  'bleach',
  'color_correction',
])
export type ColorSubCategory = z.infer<typeof ColorSubCategorySchema>

export const CurrencyCodeSchema = z.enum([
  'JPY',
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'CNY',
  'KRW',
  'SGD',
  'TWD',
])
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>

export const CustomerGenderSchema = z.enum([
  'male',
  'female',
  'other',
  'prefer_not_to_say',
])
export type CustomerGender = z.infer<typeof CustomerGenderSchema>

export const CustomerStatusTypeSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'deleted',
  'blacklisted',
])
export type CustomerStatusType = z.infer<typeof CustomerStatusTypeSchema>

export const CutSubCategorySchema = z.enum([
  'mens_cut',
  'womens_cut',
  'kids_cut',
  'bang_trim',
  'beard_trim',
])
export type CutSubCategory = z.infer<typeof CutSubCategorySchema>

export const DayOfWeekSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>

export const EmailVerificationStateTypeSchema = z.enum([
  'verified',
  'unverified',
  'pending',
])
export type EmailVerificationStateType = z.infer<
  typeof EmailVerificationStateTypeSchema
>

export const FileTypeSchema = z.enum(['image', 'document', 'other'])
export type FileType = z.infer<typeof FileTypeSchema>

export const HairThicknessSchema = z.enum(['fine', 'medium', 'thick'])
export type HairThickness = z.infer<typeof HairThicknessSchema>

export const HairTypeSchema = z.enum(['straight', 'wavy', 'curly', 'coily'])
export type HairType = z.infer<typeof HairTypeSchema>

export const InventoryStatusSchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'ordered',
  'discontinued',
])
export type InventoryStatus = z.infer<typeof InventoryStatusSchema>

export const MakeupSubCategorySchema = z.enum([
  'everyday_makeup',
  'event_makeup',
  'bridal_makeup',
  'photoshoot_makeup',
])
export type MakeupSubCategory = z.infer<typeof MakeupSubCategorySchema>

export const MembershipBenefitTypeSchema = z.enum([
  'discount_rate',
  'point_multiplier',
  'priority_booking',
  'free_service',
  'birthday_special',
  'exclusive_access',
])
export type MembershipBenefitType = z.infer<typeof MembershipBenefitTypeSchema>

export const MembershipLevelSchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum',
  'vip',
])
export type MembershipLevel = z.infer<typeof MembershipLevelSchema>

export const MembershipTierTypeSchema = z.enum([
  'regular',
  'silver',
  'gold',
  'platinum',
  'vip',
])
export type MembershipTierType = z.infer<typeof MembershipTierTypeSchema>

export const NailSubCategorySchema = z.enum([
  'manicure',
  'pedicure',
  'gel_nail',
  'nail_art',
  'nail_removal',
])
export type NailSubCategory = z.infer<typeof NailSubCategorySchema>

export const NotificationTypeSchema = z.enum(['email', 'sms', 'push', 'line'])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const OrderStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'ordered',
  'shipped',
  'delivered',
  'cancelled',
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const PasswordResetStateTypeSchema = z.enum([
  'none',
  'requested',
  'completed',
])
export type PasswordResetStateType = z.infer<
  typeof PasswordResetStateTypeSchema
>

export const PaymentMethodSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'e_money',
  'qr_payment',
  'bank_transfer',
  'point',
])
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export const PaymentStatusCodeSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partial_refund',
])
export type PaymentStatusCode = z.infer<typeof PaymentStatusCodeSchema>

export const PermSubCategorySchema = z.enum([
  'regular_perm',
  'digital_perm',
  'spiral_perm',
  'body_wave',
  'straightening',
])
export type PermSubCategory = z.infer<typeof PermSubCategorySchema>

export const PricingStrategyTypeSchema = z.enum([
  'fixed',
  'tiered',
  'dynamic',
  'package',
  'membership',
  'custom',
])
export type PricingStrategyType = z.infer<typeof PricingStrategyTypeSchema>

export const ReminderTimingSchema = z.enum([
  'one_day_before',
  'three_hours_before',
  'one_hour_before',
  'thirty_minutes_before',
])
export type ReminderTiming = z.infer<typeof ReminderTimingSchema>

export const ReservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>

export const ScalpConditionSchema = z.enum([
  'normal',
  'dry',
  'oily',
  'sensitive',
  'dandruff',
])
export type ScalpCondition = z.infer<typeof ScalpConditionSchema>

export const ServiceAvailabilityTypeSchema = z.enum([
  'always',
  'scheduled',
  'by_appointment',
  'seasonal',
  'limited',
])
export type ServiceAvailabilityType = z.infer<
  typeof ServiceAvailabilityTypeSchema
>

export const ServiceCategorySchema = z.enum([
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'other',
])
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>

export const ServiceOptionTypeSchema = z.enum([
  'addon',
  'upgrade',
  'duration',
  'product',
  'combo',
])
export type ServiceOptionType = z.infer<typeof ServiceOptionTypeSchema>

export const ServiceStatusTypeSchema = z.enum([
  'active',
  'inactive',
  'seasonal',
  'limited',
  'discontinued',
  'coming_soon',
])
export type ServiceStatusType = z.infer<typeof ServiceStatusTypeSchema>

export const SpaSubCategorySchema = z.enum([
  'head_spa',
  'scalp_massage',
  'aromatherapy',
  'relaxation',
])
export type SpaSubCategory = z.infer<typeof SpaSubCategorySchema>

export const StaffLevelSchema = z.enum([
  'junior',
  'stylist',
  'senior',
  'expert',
  'director',
])
export type StaffLevel = z.infer<typeof StaffLevelSchema>

export const StylingSubCategorySchema = z.enum([
  'blowout',
  'updo',
  'braiding',
  'extensions',
  'event_styling',
])
export type StylingSubCategory = z.infer<typeof StylingSubCategorySchema>

export const SystemRoleSchema = z.enum([
  'super_admin',
  'salon_owner',
  'salon_manager',
  'senior_staff',
  'staff',
  'receptionist',
  'customer',
  'guest',
])
export type SystemRole = z.infer<typeof SystemRoleSchema>

export const TreatmentSubCategorySchema = z.enum([
  'deep_conditioning',
  'protein_treatment',
  'scalp_treatment',
  'keratin_treatment',
  'olaplex',
])
export type TreatmentSubCategory = z.infer<typeof TreatmentSubCategorySchema>

export const TreatmentTypeSchema = z.enum([
  'cut',
  'color',
  'perm',
  'treatment',
  'head_spa',
  'styling',
  'extension',
  'nail',
  'eyelash',
  'other',
])
export type TreatmentType = z.infer<typeof TreatmentTypeSchema>

export const TwoFactorStatusSchema = z.enum(['disabled', 'pending', 'enabled'])
export type TwoFactorStatus = z.infer<typeof TwoFactorStatusSchema>

export const UserAccountStatusSchema = z.enum([
  'active',
  'unverified',
  'locked',
  'suspended',
  'deleted',
])
export type UserAccountStatus = z.infer<typeof UserAccountStatusSchema>

export const UserRoleTypeSchema = z.enum([
  'customer',
  'staff',
  'manager',
  'admin',
  'owner',
])
export type UserRoleType = z.infer<typeof UserRoleTypeSchema>
