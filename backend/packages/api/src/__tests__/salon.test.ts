import { createId } from '@beauty-salon-backend/utility'
import { sql } from 'drizzle-orm'
import type { Express } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestApp, getTestDb, request } from './_shared/test-helpers'

describe('Salon API Integration Tests', () => {
  let app: Express
  let db: ReturnType<typeof getTestDb>

  beforeEach(() => {
    app = createTestApp()
    db = getTestDb()
  })

  describe('POST /api/v1/salons', () => {
    it('should create a salon with valid data', async () => {
      // Helper to get dates for each day of the week
      const getNextDate = (dayOffset: number): string => {
        const date = new Date()
        date.setDate(date.getDate() + dayOffset)
        const [dateStr = '2020-10-08'] = date.toISOString().split('T')
        return dateStr
      }

      const salonData = {
        name: 'Test Salon',
        description: 'A test salon',
        address: {
          street: '千代田1-1-1 テストビル2F',
          city: '千代田区',
          prefecture: '東京都',
          postalCode: '100-0001',
          country: 'Japan',
        },
        contactInfo: {
          email: 'test@salon.com',
          phoneNumber: '03-1234-5678',
          alternativePhone: null,
          websiteUrl: 'https://test-salon.com',
        },
        openingHours: [
          {
            dayOfWeek: 'monday',
            date: getNextDate(1),
            openTime: '10:00',
            closeTime: '20:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
          {
            dayOfWeek: 'tuesday',
            date: getNextDate(2),
            openTime: '10:00',
            closeTime: '20:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
          {
            dayOfWeek: 'wednesday',
            date: getNextDate(3),
            openTime: '10:00',
            closeTime: '20:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
          {
            dayOfWeek: 'thursday',
            date: getNextDate(4),
            openTime: '10:00',
            closeTime: '20:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
          {
            dayOfWeek: 'friday',
            date: getNextDate(5),
            openTime: '10:00',
            closeTime: '20:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
          {
            dayOfWeek: 'saturday',
            date: getNextDate(6),
            openTime: '10:00',
            closeTime: '18:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
          {
            dayOfWeek: 'sunday',
            date: getNextDate(7),
            openTime: '10:00',
            closeTime: '18:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
        ],
        businessHours: null,
        imageUrls: null,
        features: null,
      }

      const response = await request(app).post('/api/v1/salons').send(salonData)

      // Debug: Log the response to see what's wrong
      if (response.status !== 201) {
        console.error('Create salon failed:', response.status, response.body)
      }

      expect(response.status).toBe(201)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.name).toBe(salonData.name)
      expect(response.body.data.contactInfo?.email).toBe(
        salonData.contactInfo.email,
      )

      // Verify database state
      const result = await db.execute(sql`SELECT * FROM salons`)
      expect(result.length).toBe(1)
      expect(result[0]?.name).toBe(salonData.name)
    })

    it('should return validation error for invalid email', async () => {
      const invalidData = {
        name: 'Test Salon',
        description: null,
        address: {
          street: '千代田1-1-1',
          city: '千代田区',
          prefecture: '東京都',
          postalCode: '100-0001',
          country: 'Japan',
        },
        contactInfo: {
          email: 'invalid-email', // Invalid email
          phoneNumber: '03-1234-5678',
          alternativePhone: null,
          websiteUrl: null,
        },
        openingHours: [
          {
            dayOfWeek: 'monday',
            date: null,
            openTime: '10:00',
            closeTime: '20:00',
            isHoliday: false,
            holidayName: null,
            notes: null,
          },
        ],
        businessHours: null,
        imageUrls: null,
        features: null,
      }

      const response = await request(app)
        .post('/api/v1/salons')
        .send(invalidData)
        .expect(400)

      expect(response.body.type).toBe(
        'https://example.com/probs/validation-error',
      )
      expect(response.body.detail).toContain('Validation failed')
    })

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/salons')
        .send({})
        .expect(400)

      expect(response.body.type).toBe(
        'https://example.com/probs/validation-error',
      )
      expect(response.body.detail).toContain('Validation failed')
    })
  })

  describe('GET /api/v1/salons', () => {
    it('should list all salons', async () => {
      // Create test salons
      const testSalons = [
        {
          id: createId(),
          name: 'Salon A',
          nameKana: 'サロンエー',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine1: '千代田1-1-1',
          phone: '03-1111-1111',
          email: 'salon-a@test.com',
        },
        {
          id: createId(),
          name: 'Salon B',
          nameKana: 'サロンビー',
          postalCode: '150-0001',
          prefecture: '東京都',
          city: '渋谷区',
          addressLine1: '渋谷2-2-2',
          phone: '03-2222-2222',
          email: 'salon-b@test.com',
        },
      ]

      // Insert test data using raw SQL
      for (const salon of testSalons) {
        await db.execute(sql`
          INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
          VALUES (${salon.id}, ${salon.name}, ${salon.nameKana}, ${salon.postalCode}, ${salon.prefecture}, ${salon.city}, ${salon.addressLine1}, ${salon.phone}, ${salon.email})
        `)
      }

      const response = await request(app).get('/api/v1/salons').expect(200)

      // Response should follow CursorPaginationResponse structure
      expect(response.body.data).toBeDefined()
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta).toBeDefined()
      expect(response.body.meta.total).toBe(2)
      expect(response.body.meta.hasMore).toBe(false)
      expect(response.body.links).toBeDefined()
      // Results are sorted by createdAt DESC, so Salon B (created second) comes first
      expect(response.body.data[0]?.name).toBe('Salon B')
      expect(response.body.data[1]?.name).toBe('Salon A')
    })

    it('should return empty list when no salons exist', async () => {
      const response = await request(app).get('/api/v1/salons').expect(200)

      // Response should follow CursorPaginationResponse structure
      expect(response.body.data).toBeDefined()
      expect(response.body.data).toHaveLength(0)
      expect(response.body.meta).toBeDefined()
      expect(response.body.meta.total).toBe(0)
      expect(response.body.meta.hasMore).toBe(false)
      expect(response.body.links).toBeDefined()
    })

    it('should support pagination', async () => {
      // Create 5 test salons
      const testSalons = Array.from({ length: 5 }, (_, i) => ({
        id: createId(),
        name: `Salon ${i + 1}`,
        nameKana: `サロン${i + 1}`,
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        addressLine1: `千代田1-${i + 1}-1`,
        phone: `03-1111-${String(i + 1).padStart(4, '0')}`,
        email: `salon${i + 1}@test.com`,
      }))

      // Insert test data using raw SQL
      for (const salon of testSalons) {
        await db.execute(sql`
          INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
          VALUES (${salon.id}, ${salon.name}, ${salon.nameKana}, ${salon.postalCode}, ${salon.prefecture}, ${salon.city}, ${salon.addressLine1}, ${salon.phone}, ${salon.email})
        `)
      }

      const response = await request(app)
        .get('/api/v1/salons?limit=2')
        .expect(200)

      // Response should follow CursorPaginationResponse structure
      expect(response.body.data).toBeDefined()
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta).toBeDefined()
      expect(response.body.meta.limit).toBe(2)
      expect(response.body.meta.hasMore).toBe(true)
      expect(response.body.links).toBeDefined()
    })
  })

  describe('GET /api/v1/salons/:id', () => {
    it('should get a salon by ID', async () => {
      const salonId = createId()
      const testSalon = {
        id: salonId,
        name: 'Test Salon',
        nameKana: 'テストサロン',
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        addressLine1: '千代田1-1-1',
        phone: '03-1234-5678',
        email: 'test@salon.com',
      }

      await db.execute(sql`
        INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
        VALUES (${testSalon.id}, ${testSalon.name}, ${testSalon.nameKana}, ${testSalon.postalCode}, ${testSalon.prefecture}, ${testSalon.city}, ${testSalon.addressLine1}, ${testSalon.phone}, ${testSalon.email})
      `)

      const response = await request(app)
        .get(`/api/v1/salons/${salonId}`)
        .expect(200)

      // Response should follow ApiResponse structure
      expect(response.body.data).toBeDefined()
      expect(response.body.data.id).toBe(salonId)
      expect(response.body.data.name).toBe(testSalon.name)
      expect(response.body.meta).toBeDefined()
      expect(response.body.links).toBeDefined()
      expect(response.body.links.self).toBe(`/salons/${salonId}`)
    })

    it('should return 404 for non-existent salon', async () => {
      const nonExistentId = createId()

      const response = await request(app)
        .get(`/api/v1/salons/${nonExistentId}`)
        .expect(404)

      expect(response.body.status).toBe(404)
      expect(response.body.type).toContain('not-found')
    })

    it('should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/v1/salons/invalid-uuid')
        .expect(400)

      expect(response.body.type).toBe(
        'https://example.com/probs/validation-error',
      )
    })
  })

  describe('PUT /api/v1/salons/:id', () => {
    it('should update a salon', async () => {
      const salonId = createId()
      const originalSalon = {
        id: salonId,
        name: 'Original Salon',
        nameKana: 'オリジナルサロン',
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        addressLine1: '千代田1-1-1',
        phone: '03-1234-5678',
        email: 'original@salon.com',
      }

      await db.execute(sql`
        INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
        VALUES (${originalSalon.id}, ${originalSalon.name}, ${originalSalon.nameKana}, ${originalSalon.postalCode}, ${originalSalon.prefecture}, ${originalSalon.city}, ${originalSalon.addressLine1}, ${originalSalon.phone}, ${originalSalon.email})
      `)

      const updateData = {
        name: 'Updated Salon',
        contactInfo: {
          email: 'updated@salon.com',
          phoneNumber: '03-1234-5678',
          alternativePhone: null,
          websiteUrl: null,
        },
      }

      const response = await request(app)
        .put(`/api/v1/salons/${salonId}`)
        .send(updateData)
        .expect(200)

      // Response should follow ApiResponse structure
      expect(response.body.data).toBeDefined()
      expect(response.body.data.name).toBe(updateData.name)
      expect(response.body.meta).toBeDefined()
      expect(response.body.links).toBeDefined()
      expect(response.body.links.self).toBe(`/salons/${salonId}`)
      expect(response.body.data.contactInfo.email).toBe(
        updateData.contactInfo.email,
      )

      // Verify database state
      const result = await db.execute(
        sql`SELECT * FROM salons WHERE id = ${salonId}`,
      )
      expect(result[0]?.name).toBe(updateData.name)
      expect(result[0]?.email).toBe(updateData.contactInfo.email)
      // Unchanged fields should remain the same (phoneNumber is the actual column name)
      expect(result[0]?.phoneNumber).toBe(originalSalon.phone)
    })

    it('should return 404 when updating non-existent salon', async () => {
      const nonExistentId = createId()

      const response = await request(app)
        .put(`/api/v1/salons/${nonExistentId}`)
        .send({ name: 'Updated' })
        .expect(404)

      expect(response.body.status).toBe(404)
      expect(response.body.type).toContain('not-found')
    })
  })

  describe('DELETE /api/v1/salons/:id', () => {
    it('should delete a salon', async () => {
      const salonId = createId()
      const testSalon = {
        id: salonId,
        name: 'To Delete',
        nameKana: '削除用',
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        addressLine1: '千代田1-1-1',
        phone: '03-1234-5678',
        email: 'delete@salon.com',
      }

      await db.execute(sql`
        INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
        VALUES (${testSalon.id}, ${testSalon.name}, ${testSalon.nameKana}, ${testSalon.postalCode}, ${testSalon.prefecture}, ${testSalon.city}, ${testSalon.addressLine1}, ${testSalon.phone}, ${testSalon.email})
      `)

      const response = await request(app)
        .delete(`/api/v1/salons/${salonId}`)
        .expect(204)

      expect(response.body).toEqual({})

      // Verify salon is soft-deleted (deletedAt is set, not actually removed)
      const result = await db.execute(
        sql`SELECT * FROM salons WHERE id = ${salonId}`,
      )
      expect(result).toHaveLength(1)
      expect(result[0]?.deletedAt).not.toBeNull()
    })

    it('should return 404 when deleting non-existent salon', async () => {
      const nonExistentId = createId()

      const response = await request(app)
        .delete(`/api/v1/salons/${nonExistentId}`)
        .expect(404)

      expect(response.body.status).toBe(404)
      expect(response.body.type).toContain('not-found')
    })
  })

  describe('GET /api/v1/salons/search', () => {
    it('should search salons by name', async () => {
      const testSalons = [
        {
          id: createId(),
          name: 'Beauty Salon Tokyo',
          nameKana: 'ビューティーサロントウキョウ',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine1: '千代田1-1-1',
          phone: '03-1111-1111',
          email: 'beauty@salon.com',
        },
        {
          id: createId(),
          name: 'Hair Salon Osaka',
          nameKana: 'ヘアサロンオオサカ',
          postalCode: '530-0001',
          prefecture: '大阪府',
          city: '大阪市',
          addressLine1: '北区1-1-1',
          phone: '06-2222-2222',
          email: 'hair@salon.com',
        },
      ]

      // Insert test data using raw SQL
      for (const salon of testSalons) {
        await db.execute(sql`
          INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
          VALUES (${salon.id}, ${salon.name}, ${salon.nameKana}, ${salon.postalCode}, ${salon.prefecture}, ${salon.city}, ${salon.addressLine1}, ${salon.phone}, ${salon.email})
        `)
      }

      const response = await request(app)
        .get('/api/v1/salons/search?keyword=Beauty')
        .expect(200)

      expect(response.body.results).toBeDefined()
      expect(response.body.results).toHaveLength(1)
      expect(response.body.results[0]?.name).toBe('Beauty Salon Tokyo')
    })

    it('should search salons by prefecture', async () => {
      const testSalons = [
        {
          id: createId(),
          name: 'Tokyo Salon 1',
          nameKana: 'トウキョウサロン1',
          postalCode: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          addressLine1: '千代田1-1-1',
          phone: '03-1111-1111',
          email: 'tokyo1@salon.com',
        },
        {
          id: createId(),
          name: 'Tokyo Salon 2',
          nameKana: 'トウキョウサロン2',
          postalCode: '150-0001',
          prefecture: '東京都',
          city: '渋谷区',
          addressLine1: '渋谷2-2-2',
          phone: '03-2222-2222',
          email: 'tokyo2@salon.com',
        },
        {
          id: createId(),
          name: 'Osaka Salon',
          nameKana: 'オオサカサロン',
          postalCode: '530-0001',
          prefecture: '大阪府',
          city: '大阪市',
          addressLine1: '北区1-1-1',
          phone: '06-3333-3333',
          email: 'osaka@salon.com',
        },
      ]

      // Insert test data using raw SQL
      for (const salon of testSalons) {
        await db.execute(sql`
          INSERT INTO salons (id, name, "nameKana", "postalCode", prefecture, city, address, "phoneNumber", email)
          VALUES (${salon.id}, ${salon.name}, ${salon.nameKana}, ${salon.postalCode}, ${salon.prefecture}, ${salon.city}, ${salon.addressLine1}, ${salon.phone}, ${salon.email})
        `)
      }

      const response = await request(app)
        .get('/api/v1/salons/search?city=千代田区')
        .expect(200)

      expect(response.body.results).toBeDefined()
      expect(response.body.results).toHaveLength(1)
      expect(response.body.results[0]?.name).toBe('Tokyo Salon 1')
    })
  })
})
