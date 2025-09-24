import type {
  ApiAddress,
  ApiContactInfo,
  ApiOpeningHours,
  ApiSalon,
  ApiSalonSummary,
  DbOpeningHours,
  DbSalon,
} from '../../models/salon'

export const SalonReadMapper = {
  toApiSalon(dbSalon: DbSalon, openingHours: DbOpeningHours[] = []): ApiSalon {
    return {
      id: dbSalon.id,
      name: dbSalon.name,
      description: dbSalon.description,
      address: this.toApiAddress(dbSalon),
      contactInfo: this.toApiContactInfo(dbSalon),
      openingHours: openingHours.map((oh) => this.toApiOpeningHours(oh)),
      businessHours: dbSalon.businessHours as ApiSalon['businessHours'], // jsonb field cast to API type
      imageUrls: Array.isArray(dbSalon.imageUrls)
        ? (dbSalon.imageUrls as string[])
        : [],
      features: Array.isArray(dbSalon.features)
        ? (dbSalon.features as string[])
        : [],
      rating: dbSalon.rating ? Number.parseFloat(dbSalon.rating) : null, // Convert numeric to float
      reviewCount: dbSalon.reviewCount,
      createdAt: dbSalon.createdAt,
      createdBy: 'Demo user',
      updatedAt: dbSalon.updatedAt,
      updatedBy: 'Demo user',
    }
  },

  toApiSalonSummary(dbSalon: DbSalon): ApiSalonSummary {
    return {
      id: dbSalon.id,
      name: dbSalon.name,
      address: this.toApiAddress(dbSalon),
      rating: dbSalon.rating ? Number.parseFloat(dbSalon.rating) : null, // Convert numeric to float
      reviewCount: dbSalon.reviewCount,
    }
  },

  toApiAddress(dbSalon: DbSalon): ApiAddress {
    return {
      street: dbSalon.address,
      city: dbSalon.city,
      prefecture: dbSalon.prefecture,
      postalCode: dbSalon.postalCode,
      country: 'Japan',
    }
  },

  toApiContactInfo(dbSalon: DbSalon): ApiContactInfo {
    return {
      phoneNumber: dbSalon.phoneNumber,
      alternativePhone: dbSalon.alternativePhone,
      email: dbSalon.email,
      websiteUrl: dbSalon.websiteUrl,
    }
  },

  toApiOpeningHours(dbOpeningHours: DbOpeningHours): ApiOpeningHours {
    return {
      dayOfWeek: dbOpeningHours.dayOfWeek,
      date: dbOpeningHours.date,
      openTime: dbOpeningHours.openTime,
      closeTime: dbOpeningHours.closeTime,
      isHoliday: dbOpeningHours.isHoliday,
      holidayName: dbOpeningHours.holidayName,
      notes: dbOpeningHours.notes,
    }
  },

  toApiSalonFullList(
    dbSalons: DbSalon[],
    openingHoursMap: Map<string, DbOpeningHours[]> = new Map()
  ): ApiSalon[] {
    return dbSalons.map((salon) =>
      this.toApiSalon(salon, openingHoursMap.get(salon.id) ?? [])
    )
  },

  toApiSalonList(dbSalons: DbSalon[]): ApiSalonSummary[] {
    return dbSalons.map((salon) => this.toApiSalonSummary(salon))
  },
}
