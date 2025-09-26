import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export interface CustomerSeedResult {
  customerIds: string[]
  vipCustomerId: string
  regularCustomerIds: string[]
}

export async function seedCustomers(
  db: PostgresJsDatabase<typeof schema>,
  userIds?: {
    customerUserIds: string[]
  },
): Promise<CustomerSeedResult> {
  const customers = await db
    .insert(schema.customers)
    .values([
      {
        userId: userIds?.customerUserIds[0],
        firstName: 'Yuki',
        lastName: 'Tanaka',
        firstNameKana: 'ユキ',
        lastNameKana: 'タナカ',
        email: 'customer1@example.com',
        phoneNumber: '+81-90-1234-5678',
        birthDate: '1990-05-15',
        gender: 'female',
        occupation: 'Designer',
        postalCode: '153-0063',
        prefecture: 'Tokyo',
        city: 'Meguro-ku',
        address: '7-8-9 Meguro',
        building: 'Meguro Heights 301',
        membershipTier: 'gold',
        loyaltyPoints: 2500,
        lifetimeValue: 150000,
        visitCount: 25,
        firstVisitDate: '2022-01-15',
        lastVisitDate: '2024-01-10',
        preferences: {
          preferredServices: ['cut', 'color'],
          notes: 'Prefers organic products',
        },
        tags: ['vip', 'organic-preference'],
        allowMarketing: true,
        allowSms: true,
        allowEmail: true,
        isActive: true,
      },
      {
        userId: userIds?.customerUserIds[1],
        firstName: 'Kenji',
        lastName: 'Yamamoto',
        firstNameKana: 'ケンジ',
        lastNameKana: 'ヤマモト',
        email: 'customer2@example.com',
        phoneNumber: '+81-80-9876-5432',
        birthDate: '1985-11-20',
        gender: 'male',
        occupation: 'Software Engineer',
        postalCode: '105-0001',
        prefecture: 'Tokyo',
        city: 'Minato-ku',
        address: '2-3-4 Minato',
        membershipTier: 'silver',
        loyaltyPoints: 800,
        lifetimeValue: 45000,
        visitCount: 12,
        firstVisitDate: '2023-03-01',
        lastVisitDate: '2024-01-05',
        preferences: {
          preferredServices: ['cut'],
          notes: 'Monthly regular customer',
        },
        tags: ['regular', 'monthly'],
        allowMarketing: true,
        allowSms: false,
        allowEmail: true,
        isActive: true,
      },
      {
        userId: userIds?.customerUserIds[2],
        firstName: 'Sakura',
        lastName: 'Sato',
        firstNameKana: 'サクラ',
        lastNameKana: 'サトウ',
        email: 'customer3@example.com',
        phoneNumber: '+81-70-1111-2222',
        birthDate: '1995-03-10',
        gender: 'female',
        occupation: 'Marketing Manager',
        postalCode: '160-0022',
        prefecture: 'Tokyo',
        city: 'Shinjuku-ku',
        address: '5-6-7 Shinjuku',
        building: 'Shinjuku Tower 15F',
        membershipTier: 'regular',
        loyaltyPoints: 300,
        lifetimeValue: 25000,
        visitCount: 5,
        firstVisitDate: '2023-08-15',
        lastVisitDate: '2023-12-20',
        preferences: {
          preferredServices: ['color', 'treatment', 'spa'],
          notes: 'Sensitive skin, requires patch test',
        },
        tags: ['sensitive-skin', 'treatment-focus'],
        allowMarketing: true,
        allowSms: true,
        allowEmail: true,
        isActive: true,
      },
      {
        userId: userIds?.customerUserIds[3],
        firstName: 'Hiroshi',
        lastName: 'Nakamura',
        firstNameKana: 'ヒロシ',
        lastNameKana: 'ナカムラ',
        email: 'vip.customer@example.com',
        phoneNumber: '+81-90-5555-6666',
        birthDate: '1975-07-25',
        gender: 'male',
        occupation: 'CEO',
        postalCode: '107-0052',
        prefecture: 'Tokyo',
        city: 'Minato-ku',
        address: '1-1-1 Roppongi',
        building: 'Roppongi Hills Residence',
        membershipTier: 'platinum',
        loyaltyPoints: 10000,
        lifetimeValue: 500000,
        visitCount: 100,
        firstVisitDate: '2020-01-01',
        lastVisitDate: '2024-01-15',
        preferences: {
          preferredServices: ['cut', 'spa', 'treatment'],
          notes: 'VIP customer, requires private room',
        },
        tags: ['vip', 'platinum', 'high-value'],
        allowMarketing: false,
        allowSms: false,
        allowEmail: true,
        isActive: true,
      },
    ])
    .returning({ id: schema.customers.id })

  const vipCustomerId = customers[3]?.id ?? ''
  const regularCustomerIds = customers.slice(0, 3).map((c) => c.id)

  // Link users to customers
  if (userIds?.customerUserIds && customers.length > 0) {
    for (
      let i = 0;
      i < Math.min(userIds.customerUserIds.length, customers.length);
      i++
    ) {
      const userId = userIds.customerUserIds[i]
      const customerId = customers[i]?.id
      if (userId && customerId) {
        await db
          .update(schema.users)
          .set({ customerId })
          .where(eq(schema.users.id, userId))
      }
    }
  }

  return {
    customerIds: customers.map((c) => c.id),
    vipCustomerId,
    regularCustomerIds,
  }
}
