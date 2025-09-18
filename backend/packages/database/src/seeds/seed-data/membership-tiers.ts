import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export async function seedMembershipTiers(
  db: PostgresJsDatabase<typeof schema>,
  salonIds: string[]
): Promise<string[]> {
  const membershipTiers = []

  for (const salonId of salonIds) {
    membershipTiers.push(
      {
        salonId,
        tier: 'regular' as const,
        name: 'Regular Member',
        description: 'Standard membership with basic benefits',
        requiredPoints: 0,
        requiredAmount: 0,
        discountRate: '0.00',
        pointMultiplier: '1.0',
        benefits: ['Online booking', 'Birthday discount'],
        color: '#808080',
        sortOrder: 1,
        isActive: true,
      },
      {
        salonId,
        tier: 'silver' as const,
        name: 'Silver Member',
        description: 'Enhanced membership with additional perks',
        requiredPoints: 500,
        requiredAmount: 50000,
        discountRate: '5.00',
        pointMultiplier: '1.2',
        benefits: [
          '5% discount',
          'Priority booking',
          'Birthday gift',
          '1.2x points',
        ],
        color: '#C0C0C0',
        sortOrder: 2,
        isActive: true,
      },
      {
        salonId,
        tier: 'gold' as const,
        name: 'Gold Member',
        description: 'Premium membership with exclusive benefits',
        requiredPoints: 2000,
        requiredAmount: 150000,
        discountRate: '10.00',
        pointMultiplier: '1.5',
        benefits: [
          '10% discount',
          'VIP booking',
          'Free treatments',
          'Birthday spa',
          '1.5x points',
        ],
        color: '#FFD700',
        sortOrder: 3,
        isActive: true,
      },
      {
        salonId,
        tier: 'platinum' as const,
        name: 'Platinum Member',
        description: 'Elite membership with maximum privileges',
        requiredPoints: 5000,
        requiredAmount: 300000,
        discountRate: '15.00',
        pointMultiplier: '2.0',
        benefits: [
          '15% discount',
          'Concierge service',
          'Private room access',
          'Monthly free service',
          'Double points',
          'Exclusive events',
        ],
        color: '#E5E4E2',
        sortOrder: 4,
        isActive: true,
      },
      {
        salonId,
        tier: 'vip' as const,
        name: 'VIP Member',
        description: 'Invitation-only membership with unlimited benefits',
        requiredPoints: 10000,
        requiredAmount: 1000000,
        discountRate: '20.00',
        pointMultiplier: '3.0',
        benefits: [
          '20% discount',
          'Personal stylist',
          'Home service available',
          'Unlimited services',
          'Triple points',
          'Family benefits',
        ],
        color: '#4B0082',
        sortOrder: 5,
        isActive: true,
      }
    )
  }

  const tiers = await db
    .insert(schema.membershipTiers)
    .values(membershipTiers)
    .returning({ id: schema.membershipTiers.id })

  return tiers.map((t) => t.id)
}
