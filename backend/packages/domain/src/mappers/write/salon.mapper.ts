import type {
  ApiCreateSalonRequest,
  ApiOpeningHours,
  ApiUpdateSalonRequest,
  DbNewOpeningHours,
  DbNewSalon,
} from '../../models/salon'

export const SalonWriteMapper = {
  fromCreateRequest(request: ApiCreateSalonRequest): {
    salon: DbNewSalon
    openingHours: DbNewOpeningHours[]
  } {
    const salon: DbNewSalon = {
      name: request.name,
      nameKana: null,
      description: request.description,
      postalCode: request.address.postalCode,
      prefecture: request.address.prefecture,
      city: request.address.city,
      address: request.address.street,
      building: null,
      latitude: null,
      longitude: null,
      phoneNumber: request.contactInfo.phoneNumber,
      alternativePhone: request.contactInfo.alternativePhone,
      email: request.contactInfo.email,
      websiteUrl: request.contactInfo.websiteUrl,
      logoUrl: null,
      imageUrls: request.imageUrls,
      features: request.features,
      amenities: [],
      timezone: 'Asia/Tokyo',
      currency: 'JPY',
      taxRate: '10.00',
      cancellationPolicy: null,
      bookingPolicy: null,
      businessHours: request.businessHours,
      rating: null,
      reviewCount: 0,
      isActive: true,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const openingHours: DbNewOpeningHours[] = request.openingHours.map((oh) =>
      this.mapOpeningHours(oh, '')
    )

    return { salon, openingHours }
  },

  fromUpdateRequest(request: ApiUpdateSalonRequest): Partial<DbNewSalon> {
    const updates: Partial<DbNewSalon> = {}

    if (request.name !== undefined) {
      updates.name = request.name
    }

    if (request.description !== undefined) {
      updates.description = request.description
    }

    if (request.address !== undefined) {
      if (request.address.postalCode !== undefined) {
        updates.postalCode = request.address.postalCode
      }
      if (request.address.prefecture !== undefined) {
        updates.prefecture = request.address.prefecture
      }
      if (request.address.city !== undefined) {
        updates.city = request.address.city
      }
      if (request.address.street !== undefined) {
        updates.address = request.address.street
      }
    }

    if (request.contactInfo !== undefined) {
      if (request.contactInfo.phoneNumber !== undefined) {
        updates.phoneNumber = request.contactInfo.phoneNumber
      }
      if (request.contactInfo.alternativePhone !== undefined) {
        updates.alternativePhone = request.contactInfo.alternativePhone
      }
      if (request.contactInfo.email !== undefined) {
        updates.email = request.contactInfo.email
      }
    }

    if (request.imageUrls !== undefined) {
      updates.imageUrls = request.imageUrls
    }

    if (request.features !== undefined) {
      updates.features = request.features
    }

    updates.updatedAt = new Date().toISOString()

    return updates
  },

  mapOpeningHours(hours: ApiOpeningHours, salonId: string): DbNewOpeningHours {
    return {
      salonId,
      dayOfWeek: hours.dayOfWeek,
      specificDate: hours.date,
      openTime: hours.openTime,
      closeTime: hours.closeTime,
      isHoliday: hours.isHoliday,
      holidayName: hours.holidayName,
      notes: hours.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  },

  toDbOpeningHours(
    openingHours: ApiOpeningHours[],
    salonId: string
  ): DbNewOpeningHours[] {
    return openingHours.map((oh) => this.mapOpeningHours(oh, salonId))
  },
}
