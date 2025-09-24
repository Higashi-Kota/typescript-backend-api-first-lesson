import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'
import type { ServiceCategorySeedResult } from './service-categories'

export interface ServiceSeedResult {
  serviceIds: string[]
  serviceMap: Record<string, string[]> // salonId -> serviceIds
}

export async function seedServices(
  db: PostgresJsDatabase<typeof schema>,
  salonIds: string[],
  categoryResult: ServiceCategorySeedResult,
): Promise<ServiceSeedResult> {
  const services = []
  const { categoryMap } = categoryResult

  const salonId1 = salonIds[0]
  const salonId2 = salonIds[1]

  if (!(salonId1 && salonId2)) {
    throw new Error('At least 2 salon IDs required for services seeding')
  }

  // Services for Salon 1 (Beauty Studio Tokyo)
  services.push(
    // Cut services
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_cut`],
      name: 'Ladies Cut',
      description: 'Professional hair cut for ladies with consultation',
      shortDescription: 'Includes shampoo, cut, and blow dry',
      duration: 60,
      price: 5500,
      taxIncluded: true,
      requiredStaffLevel: 'stylist' as const,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_cut`],
      name: 'Mens Cut',
      description: 'Professional hair cut for men',
      shortDescription: 'Includes shampoo, cut, and styling',
      duration: 45,
      price: 4000,
      taxIncluded: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_cut`],
      name: 'Kids Cut (Under 12)',
      description: 'Hair cut for children under 12 years old',
      shortDescription: 'Quick and gentle service for kids',
      duration: 30,
      price: 2500,
      taxIncluded: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 3,
    },

    // Color services
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_color`],
      name: 'Full Color',
      description: 'Complete hair coloring from roots to tips',
      shortDescription: 'Single process color application',
      duration: 120,
      price: 8000,
      discountPrice: 7200,
      taxIncluded: true,
      requiredStaffLevel: 'stylist' as const,
      requiresConsultation: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 4,
    },
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_color`],
      name: 'Highlights',
      description: 'Professional highlighting with foil technique',
      shortDescription: 'Partial or full head highlights',
      duration: 150,
      price: 12000,
      taxIncluded: true,
      requiredStaffLevel: 'senior' as const,
      requiresConsultation: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 5,
    },
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_color`],
      name: 'Balayage',
      description:
        'Hand-painted balayage technique for natural-looking highlights',
      shortDescription: 'Custom balayage coloring',
      duration: 180,
      price: 15000,
      taxIncluded: true,
      requiredStaffLevel: 'expert' as const,
      requiresConsultation: true,
      allowOnlineBooking: false,
      isActive: true,
      sortOrder: 6,
    },

    // Perm services
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_perm`],
      name: 'Digital Perm',
      description: 'Modern digital perm for lasting curls',
      shortDescription: 'Heat-activated curling system',
      duration: 180,
      price: 14000,
      taxIncluded: true,
      requiredStaffLevel: 'senior' as const,
      requiresConsultation: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 7,
    },
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_perm`],
      name: 'Straight Perm',
      description: 'Japanese straightening treatment',
      shortDescription: 'Permanent hair straightening',
      duration: 240,
      price: 18000,
      taxIncluded: true,
      requiredStaffLevel: 'expert' as const,
      requiresConsultation: true,
      allowOnlineBooking: false,
      isActive: true,
      sortOrder: 8,
    },

    // Treatment services
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_treatment`],
      name: 'Deep Conditioning Treatment',
      description: 'Intensive moisture treatment for damaged hair',
      shortDescription: 'Repair and hydrate',
      duration: 30,
      price: 3500,
      taxIncluded: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 9,
    },
    {
      salonId: salonId1,
      categoryId: categoryMap[`${salonId1}_treatment`],
      name: 'Keratin Treatment',
      description: 'Professional keratin smoothing treatment',
      shortDescription: 'Smooth and strengthen',
      duration: 90,
      price: 8000,
      taxIncluded: true,
      requiredStaffLevel: 'senior' as const,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 10,
    },
  )

  // Services for Salon 2 (Hair & Spa Osaka)
  services.push(
    // Spa services
    {
      salonId: salonId2,
      categoryId: categoryMap[`${salonId2}_spa`],
      name: 'Head Spa (30 min)',
      description: 'Relaxing head spa with scalp massage',
      shortDescription: 'Stress relief and scalp care',
      duration: 30,
      price: 3000,
      taxIncluded: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      salonId: salonId2,
      categoryId: categoryMap[`${salonId2}_spa`],
      name: 'Premium Head Spa (60 min)',
      description: 'Luxury head spa with aromatherapy',
      shortDescription: 'Ultimate relaxation experience',
      duration: 60,
      price: 6000,
      discountPrice: 5400,
      taxIncluded: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      salonId: salonId2,
      categoryId: categoryMap[`${salonId2}_spa`],
      name: 'Scalp Treatment',
      description: 'Therapeutic scalp treatment for health',
      shortDescription: 'Improve scalp condition',
      duration: 45,
      price: 4500,
      taxIncluded: true,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 3,
    },

    // Cut services for Salon 2
    {
      salonId: salonId2,
      categoryId: categoryMap[`${salonId2}_cut`],
      name: 'Signature Cut',
      description: 'Our signature cutting technique',
      shortDescription: 'Personalized style consultation',
      duration: 75,
      price: 6500,
      taxIncluded: true,
      requiredStaffLevel: 'senior' as const,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 4,
    },

    // Package services
    {
      salonId: salonId2,
      categoryId: categoryMap[`${salonId2}_other`],
      name: 'Spa & Cut Package',
      description: 'Complete relaxation and styling package',
      shortDescription: 'Head spa + Cut + Treatment',
      duration: 150,
      price: 12000,
      discountPrice: 10000,
      taxIncluded: true,
      isPackage: true,
      packageServiceIds: [],
      requiresConsultation: false,
      allowOnlineBooking: true,
      isActive: true,
      sortOrder: 5,
    },
  )

  const insertedServices = await db
    .insert(schema.services)
    .values(services)
    .returning({
      id: schema.services.id,
      salonId: schema.services.salonId,
    })

  // Create service options for some services
  const serviceOptions = []
  const firstServiceId = insertedServices[0]?.id

  if (firstServiceId) {
    serviceOptions.push(
      {
        serviceId: firstServiceId,
        name: 'Fringe Trim',
        description: 'Quick fringe/bangs trim',
        additionalTime: 10,
        additionalPrice: 500,
        isRequired: false,
        sortOrder: 1,
        isActive: true,
      },
      {
        serviceId: firstServiceId,
        name: 'Hair Treatment Add-on',
        description: 'Add deep conditioning treatment',
        additionalTime: 20,
        additionalPrice: 2000,
        isRequired: false,
        sortOrder: 2,
        isActive: true,
      },
    )
  }

  if (serviceOptions.length > 0) {
    await db.insert(schema.serviceOptions).values(serviceOptions)
  }

  // Build service map
  const serviceMap: Record<string, string[]> = {}
  for (const service of insertedServices) {
    if (!serviceMap[service.salonId]) {
      serviceMap[service.salonId] = []
    }
    const serviceList = serviceMap[service.salonId]
    if (serviceList) {
      serviceList.push(service.id)
    }
  }

  return {
    serviceIds: insertedServices.map((s) => s.id),
    serviceMap,
  }
}
