/**
 * Get Staff Read Mapper
 * Maps database records to domain models and domain models to API responses
 */

import type { components } from '@beauty-salon-backend/generated'
import { match } from 'ts-pattern'
import type {
  SalonId,
  Staff,
  StaffAvailability,
  StaffId,
  StaffPerformance,
  StaffSearchResult,
  StaffState,
} from '../../models/staff'

// Type aliases for clarity
type ApiStaffResponse = components['schemas']['Models.Staff']
type DbStaffRecord = {
  id: string
  salonId: string
  name: string
  email: string
  phoneNumber: string
  specialties: string[]
  imageUrl: string | null
  bio: string | null
  yearsOfExperience: number | null
  certifications: string[] | null
  qualifications: any | null // JSON field
  schedules: any | null // JSON field
  permissions: any | null // JSON field
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  updatedBy: string | null
}

/**
 * Map Database Record to Domain Model
 */
export const mapGetStaffDbToDomain = (record: DbStaffRecord): Staff => {
  return {
    id: record.id as StaffId,
    salonId: record.salonId as SalonId,
    name: record.name,
    contactInfo: {
      email: record.email,
      phoneNumber: record.phoneNumber,
      alternativePhone: undefined,
    },
    specialties: record.specialties,
    imageUrl: record.imageUrl ?? undefined,
    bio: record.bio ?? undefined,
    yearsOfExperience: record.yearsOfExperience ?? undefined,
    certifications: record.certifications ?? undefined,
    // Optional domain properties from database
    ...(record.qualifications && {
      qualifications: JSON.parse(record.qualifications),
    }),
    ...(record.schedules && {
      schedules: JSON.parse(record.schedules),
    }),
    ...(record.permissions && {
      permissions: JSON.parse(record.permissions),
    }),
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    createdBy: record.createdBy ?? undefined,
    updatedAt: record.updatedAt.toISOString(),
    updatedBy: record.updatedBy ?? undefined,
  }
}

/**
 * Map Domain Model to API Response
 */
export const mapGetStaffDomainToApi = (staff: Staff): ApiStaffResponse => {
  return {
    id: staff.id,
    salonId: staff.salonId,
    name: staff.name,
    contactInfo: {
      email: staff.contactInfo.email,
      phoneNumber: staff.contactInfo.phoneNumber,
      alternativePhone: staff.contactInfo.alternativePhone,
    },
    specialties: staff.specialties,
    imageUrl: staff.imageUrl,
    bio: staff.bio,
    yearsOfExperience: staff.yearsOfExperience,
    certifications: staff.certifications,
    // Optional properties only included if present
    ...(staff.qualifications && { qualifications: staff.qualifications }),
    ...(staff.schedules && { schedules: staff.schedules }),
    isActive: staff.isActive,
    ...(staff.permissions && { permissions: staff.permissions }),
    createdAt: staff.createdAt,
    createdBy: staff.createdBy,
    updatedAt: staff.updatedAt,
    updatedBy: staff.updatedBy,
  }
}

/**
 * Map Domain Model to Detailed API Response with additional data
 */
export const mapGetStaffDetailDomainToApi = (
  staff: Staff,
  additionalData?: {
    performance?: StaffPerformance
    currentAvailability?: StaffAvailability[]
    upcomingSchedules?: any[]
    recentReviews?: any[]
  }
): ApiStaffResponse & {
  performance?: StaffPerformance
  currentAvailability?: StaffAvailability[]
  upcomingSchedules?: any[]
  recentReviews?: any[]
} => {
  const baseResponse = mapGetStaffDomainToApi(staff)

  return {
    ...baseResponse,
    performance: additionalData?.performance,
    currentAvailability: additionalData?.currentAvailability,
    upcomingSchedules: additionalData?.upcomingSchedules,
    recentReviews: additionalData?.recentReviews,
  }
}

/**
 * Complete flow: DB → Domain → API
 */
export const getStaffReadFlow = (record: DbStaffRecord): ApiStaffResponse => {
  const domainStaff = mapGetStaffDbToDomain(record)
  return mapGetStaffDomainToApi(domainStaff)
}

/**
 * Map multiple database records
 */
export const mapGetStaffListDbToDomain = (
  records: DbStaffRecord[]
): Staff[] => {
  return records.map(mapGetStaffDbToDomain)
}

/**
 * Map multiple domain models to API responses
 */
export const mapGetStaffListDomainToApi = (
  staffList: Staff[]
): ApiStaffResponse[] => {
  return staffList.map(mapGetStaffDomainToApi)
}

/**
 * Complete flow for list: DB → Domain → API
 */
export const getStaffListReadFlow = (
  records: DbStaffRecord[]
): ApiStaffResponse[] => {
  const domainStaffList = mapGetStaffListDbToDomain(records)
  return mapGetStaffListDomainToApi(domainStaffList)
}

/**
 * Map Staff State to API Response with status
 */
export const mapStaffStateToApi = (
  state: StaffState
): ApiStaffResponse & { status: string } => {
  return match(state)
    .with({ type: 'active' }, ({ staff }) => ({
      ...mapGetStaffDomainToApi(staff),
      status: 'active',
    }))
    .with({ type: 'on_leave' }, ({ staff, leaveType }) => ({
      ...mapGetStaffDomainToApi(staff),
      status: `on_${leaveType}_leave`,
    }))
    .with({ type: 'training' }, ({ staff }) => ({
      ...mapGetStaffDomainToApi(staff),
      status: 'training',
    }))
    .with({ type: 'suspended' }, ({ staff }) => ({
      ...mapGetStaffDomainToApi(staff),
      status: 'suspended',
    }))
    .with(
      { type: 'terminated' },
      ({ staffId }) =>
        ({
          id: staffId,
          status: 'terminated',
        }) as any
    )
    .exhaustive()
}

/**
 * Map Search Result to API Response
 */
export const mapStaffSearchResultToApi = (
  result: StaffSearchResult
): {
  success: boolean
  data?: ApiStaffResponse[]
  totalCount?: number
  error?: string
} => {
  return match(result)
    .with({ type: 'found' }, ({ staff, totalCount }) => ({
      success: true,
      data: mapGetStaffListDomainToApi(staff),
      totalCount,
    }))
    .with({ type: 'empty' }, ({ query }) => ({
      success: true,
      data: [],
      totalCount: 0,
      message: `No staff found matching query: ${JSON.stringify(query)}`,
    }))
    .with({ type: 'error' }, ({ error }) => ({
      success: false,
      error: match(error)
        .with(
          { type: 'validation' },
          (e) =>
            `Validation error: ${e.errors.map((ve) => ve.message).join(', ')}`
        )
        .with(
          { type: 'notFound' },
          (e) => `Not found: ${e.entity} with id ${e.id}`
        )
        .with({ type: 'conflict' }, (e) => e.message)
        .with({ type: 'businessRule' }, (e) => e.message)
        .with({ type: 'system' }, (e) => e.message)
        .exhaustive(),
    }))
    .exhaustive()
}

/**
 * Map availability for scheduling
 */
export const mapStaffAvailabilityToApi = (
  availability: StaffAvailability[]
): components['schemas']['Models.StaffAvailability'][] => {
  return availability.map((a) => ({
    staffId: a.staffId,
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
    breakStart: a.breakStart,
    breakEnd: a.breakEnd,
  }))
}

/**
 * Map performance metrics
 */
export const mapStaffPerformanceToApi = (
  performance: StaffPerformance
): components['schemas']['Models.StaffPerformance'] => {
  return {
    staffId: performance.staffId,
    staffName: performance.staffName,
    totalSales: performance.totalSales,
    serviceCount: performance.serviceCount,
    averageServiceValue: performance.averageServiceValue,
    customerSatisfaction: performance.customerSatisfaction,
  }
}
