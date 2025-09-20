import { z } from 'zod'

export const AllergySeverityTypeSchema = z.enum(['mild', 'moderate', 'severe'])
export type AllergySeverityType = z.infer<typeof AllergySeverityTypeSchema>

export const AllergyTypeSchema = z.enum([
  'chemical',
  'fragrance',
  'metal',
  'latex',
  'plant',
  'other',
])
export type AllergyType = z.infer<typeof AllergyTypeSchema>

export const AuthUserRoleTypeSchema = z.enum(['customer', 'staff', 'admin'])
export type AuthUserRoleType = z.infer<typeof AuthUserRoleTypeSchema>

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

export const BookingStatusCodeTypeSchema = z.enum([
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
])
export type BookingStatusCodeType = z.infer<typeof BookingStatusCodeTypeSchema>

export const ColorSubCategoryTypeSchema = z.enum([
  'full_color',
  'root_touch',
  'highlights',
  'lowlights',
  'balayage',
  'ombre',
  'bleach',
  'color_correction',
])
export type ColorSubCategoryType = z.infer<typeof ColorSubCategoryTypeSchema>

export const ContactMethodTypeSchema = z.enum(['email', 'sms', 'phone', 'push'])
export type ContactMethodType = z.infer<typeof ContactMethodTypeSchema>

export const CurrencyCodeTypeSchema = z.enum([
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
export type CurrencyCodeType = z.infer<typeof CurrencyCodeTypeSchema>

export const CustomerGenderTypeSchema = z.enum([
  'male',
  'female',
  'other',
  'prefer_not_to_say',
])
export type CustomerGenderType = z.infer<typeof CustomerGenderTypeSchema>

export const CustomerStatusTypeSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'deleted',
  'blacklisted',
])
export type CustomerStatusType = z.infer<typeof CustomerStatusTypeSchema>

export const CutSubCategoryTypeSchema = z.enum([
  'mens_cut',
  'womens_cut',
  'kids_cut',
  'bang_trim',
  'beard_trim',
])
export type CutSubCategoryType = z.infer<typeof CutSubCategoryTypeSchema>

export const DayOfWeekTypeSchema = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export type DayOfWeekType = z.infer<typeof DayOfWeekTypeSchema>

export const EmailVerificationStateTypeSchema = z.enum([
  'verified',
  'unverified',
  'pending',
])
export type EmailVerificationStateType = z.infer<
  typeof EmailVerificationStateTypeSchema
>

export const ErrorCodeTypeSchema = z.enum([
  '1001',
  '1002',
  '1003',
  '1004',
  '1005',
  '1006',
  '1007',
  '2001',
  '2002',
  '2003',
  '2004',
  '2005',
  '3001',
  '3002',
  '3003',
  '3004',
  '3005',
  '3006',
  '3007',
  '4001',
  '4002',
  '4003',
  '4004',
  '4005',
])
export type ErrorCodeType = z.infer<typeof ErrorCodeTypeSchema>

export const FileTypeSchema = z.enum(['image', 'document', 'other'])
export type FileType = z.infer<typeof FileTypeSchema>

export const HairThicknessTypeSchema = z.enum(['fine', 'medium', 'thick'])
export type HairThicknessType = z.infer<typeof HairThicknessTypeSchema>

export const HairTypeSchema = z.enum(['straight', 'wavy', 'curly', 'coily'])
export type HairType = z.infer<typeof HairTypeSchema>

export const InventoryStatusTypeSchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'ordered',
  'discontinued',
])
export type InventoryStatusType = z.infer<typeof InventoryStatusTypeSchema>

export const LoyaltyTierTypeSchema = z.enum([
  'bronze',
  'silver',
  'gold',
  'platinum',
])
export type LoyaltyTierType = z.infer<typeof LoyaltyTierTypeSchema>

export const MakeupSubCategoryTypeSchema = z.enum([
  'everyday_makeup',
  'event_makeup',
  'bridal_makeup',
  'photoshoot_makeup',
])
export type MakeupSubCategoryType = z.infer<typeof MakeupSubCategoryTypeSchema>

export const MembershipBenefitTypeSchema = z.enum([
  'discount_rate',
  'point_multiplier',
  'priority_booking',
  'free_service',
  'birthday_special',
  'exclusive_access',
])
export type MembershipBenefitType = z.infer<typeof MembershipBenefitTypeSchema>

export const MembershipTierTypeSchema = z.enum([
  'regular',
  'silver',
  'gold',
  'platinum',
  'vip',
])
export type MembershipTierType = z.infer<typeof MembershipTierTypeSchema>

export const NailSubCategoryTypeSchema = z.enum([
  'manicure',
  'pedicure',
  'gel_nail',
  'nail_art',
  'nail_removal',
])
export type NailSubCategoryType = z.infer<typeof NailSubCategoryTypeSchema>

export const NotificationTypeSchema = z.enum(['email', 'sms', 'push', 'line'])
export type NotificationType = z.infer<typeof NotificationTypeSchema>

export const OrderStatusTypeSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'ordered',
  'shipped',
  'delivered',
  'cancelled',
])
export type OrderStatusType = z.infer<typeof OrderStatusTypeSchema>

export const PasswordResetStateTypeSchema = z.enum([
  'none',
  'requested',
  'completed',
])
export type PasswordResetStateType = z.infer<
  typeof PasswordResetStateTypeSchema
>

export const PaymentMethodTypeSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'e_money',
  'qr_payment',
  'bank_transfer',
  'point',
])
export type PaymentMethodType = z.infer<typeof PaymentMethodTypeSchema>

export const PaymentStatusCodeTypeSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'partial_refund',
])
export type PaymentStatusCodeType = z.infer<typeof PaymentStatusCodeTypeSchema>

export const PermSubCategoryTypeSchema = z.enum([
  'regular_perm',
  'digital_perm',
  'spiral_perm',
  'body_wave',
  'straightening',
])
export type PermSubCategoryType = z.infer<typeof PermSubCategoryTypeSchema>

export const PricingStrategyTypeSchema = z.enum([
  'fixed',
  'tiered',
  'dynamic',
  'package',
  'membership',
  'custom',
])
export type PricingStrategyType = z.infer<typeof PricingStrategyTypeSchema>

export const ReminderTimingTypeSchema = z.enum([
  'one_day_before',
  'three_hours_before',
  'one_hour_before',
  'thirty_minutes_before',
])
export type ReminderTimingType = z.infer<typeof ReminderTimingTypeSchema>

export const ReservationStatusTypeSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
])
export type ReservationStatusType = z.infer<typeof ReservationStatusTypeSchema>

export const ScalpConditionTypeSchema = z.enum([
  'normal',
  'dry',
  'oily',
  'sensitive',
  'dandruff',
])
export type ScalpConditionType = z.infer<typeof ScalpConditionTypeSchema>

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

export const ServiceCategoryTypeSchema = z.enum([
  'cut',
  'color',
  'perm',
  'treatment',
  'spa',
  'other',
])
export type ServiceCategoryType = z.infer<typeof ServiceCategoryTypeSchema>

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

export const SpaSubCategoryTypeSchema = z.enum([
  'head_spa',
  'scalp_massage',
  'aromatherapy',
  'relaxation',
])
export type SpaSubCategoryType = z.infer<typeof SpaSubCategoryTypeSchema>

export const StaffLevelTypeSchema = z.enum([
  'junior',
  'stylist',
  'senior',
  'expert',
  'director',
])
export type StaffLevelType = z.infer<typeof StaffLevelTypeSchema>

export const StylingSubCategoryTypeSchema = z.enum([
  'blowout',
  'updo',
  'braiding',
  'extensions',
  'event_styling',
])
export type StylingSubCategoryType = z.infer<
  typeof StylingSubCategoryTypeSchema
>

export const SystemRoleTypeSchema = z.enum([
  'super_admin',
  'salon_owner',
  'salon_manager',
  'senior_staff',
  'staff',
  'receptionist',
  'customer',
  'guest',
])
export type SystemRoleType = z.infer<typeof SystemRoleTypeSchema>

export const TreatmentSubCategoryTypeSchema = z.enum([
  'deep_conditioning',
  'protein_treatment',
  'scalp_treatment',
  'keratin_treatment',
  'olaplex',
])
export type TreatmentSubCategoryType = z.infer<
  typeof TreatmentSubCategoryTypeSchema
>

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

export const TwoFactorStatusTypeSchema = z.enum([
  'disabled',
  'pending',
  'enabled',
])
export type TwoFactorStatusType = z.infer<typeof TwoFactorStatusTypeSchema>

export const UserAccountStatusTypeSchema = z.enum([
  'active',
  'unverified',
  'locked',
  'suspended',
  'deleted',
])
export type UserAccountStatusType = z.infer<typeof UserAccountStatusTypeSchema>

export const UserRoleTypeSchema = z.enum([
  'customer',
  'staff',
  'manager',
  'admin',
  'owner',
])
export type UserRoleType = z.infer<typeof UserRoleTypeSchema>
