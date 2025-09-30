# バックエンド

## 初回のみNeonDBでv15のPostgresバージョン作成

コネクションプール付き接続文字列を発行

## RenderでWebService新規作成

.env.productionで以下を更新

PORT:3000->10000
DATABASE_URL:xxx->発行した接続文字列
POSTGRES_USER:xxx->発行した接続文字列に含まれるユーザー名
POSTGRES_PASSWORD:xxx->発行した接続文字列に含まれるパスワード

## Renderでデプロイボタンでデプロイ

```bash
$ curl -s https://typescript-backend-api-first-lesson-o2ue.onrender.com/health | awk 4
{"status":"ok"}
```

## 初期セットアップ

```bash
$ NODE_ENV=production pnpm --filter @beauty-salon-backend/database db:setup
✅ Database setup completed successfully!
```


## テストデータ洗い替え
```bash
$ NODE_ENV=production pnpm --filter @beauty-salon-backend/database db:truncate
✅ Database truncation completed successfully!

$ NODE_ENV=production pnpm --filter @beauty-salon-backend/database db:seed
✅ Database population completed successfully!
```

## マイグレーション

TBD

## ドロップ

TBD

## データ登録

```bash
curl -s -X POST https://typescript-backend-api-first-lesson-o2ue.onrender.com/api/v1/salons \
    -H "Content-Type: application/json" \
    -d '{
      "name": "テストサロン",
      "description": "美容とリラクゼーションを提供するサロンです",
      "address": {
        "street": "千代田1-1-1 テストビル2F",
        "city": "千代田区",
        "prefecture": "東京都",
        "postalCode": "100-0001",
        "country": "Japan"
      },
      "contactInfo": {
        "email": "info@testsalon.com",
        "phoneNumber": "03-1234-5678",
        "alternativePhone": null,
        "websiteUrl": "https://testsalon.com"
      },
      "openingHours": [
        {
          "dayOfWeek": "monday",
          "date": "'$(date -d "+1 day" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "20:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        },
        {
          "dayOfWeek": "tuesday",
          "date": "'$(date -d "+2 days" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "20:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        },
        {
          "dayOfWeek": "wednesday",
          "date": "'$(date -d "+3 days" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "20:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        },
        {
          "dayOfWeek": "thursday",
          "date": "'$(date -d "+4 days" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "20:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        },
        {
          "dayOfWeek": "friday",
          "date": "'$(date -d "+5 days" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "20:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        },
        {
          "dayOfWeek": "saturday",
          "date": "'$(date -d "+6 days" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "18:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        },
        {
          "dayOfWeek": "sunday",
          "date": "'$(date -d "+7 days" +%Y-%m-%d)'",
          "openTime": "10:00",
          "closeTime": "18:00",
          "isHoliday": false,
          "holidayName": null,
          "notes": null
        }
      ],
      "businessHours": null,
      "imageUrls": null,
      "features": null
    }' | jq
```

## データ取得

```bash
$ curl -s -X GET "https://typescript-backend-api-first-lesson-o2ue.onrender.com/api/v1/salons" | jq
{
  "data": [
    {
      "id": "01999b2b-857f-7588-ba02-447627e58b0d",
      "name": "テストサロン",
      "description": "美容とリラクゼーションを提供するサロンです",
      "address": {
        "street": "千代田1-1-1 テストビル2F",
        "city": "千代田区",
        "prefecture": "東京都",
        "postalCode": "100-0001",
        "country": "Japan"
      },
      "contactInfo": {
        "phoneNumber": "03-1234-5678",
        "alternativePhone": null,
        "email": "info@testsalon.com",
        "websiteUrl": "https://testsalon.com"
      },
      "openingHours": [],
      "businessHours": null,
      "imageUrls": [],
      "features": [],
      "rating": null,
      "reviewCount": 0,
      "createdAt": "2025-09-30 15:09:04.767+00",
      "createdBy": "Demo user",
      "updatedAt": "2025-09-30 15:09:04.767+00",
      "updatedBy": "Demo user"
    },
    {
      "id": "443c88a4-3147-4f8b-8634-75d68fdbcb9b",
      "name": "Beauty Studio Tokyo",
      "description": "Premium beauty salon in the heart of Tokyo",
      "address": {
        "street": "1-2-3 Shibuya",
        "city": "Shibuya-ku",
        "prefecture": "Tokyo",
        "postalCode": "150-0002",
        "country": "Japan"
      },
      "contactInfo": {
        "phoneNumber": "+81-3-1234-5678",
        "alternativePhone": null,
        "email": "info@beautystudio-tokyo.jp",
        "websiteUrl": "https://beautystudio-tokyo.jp"
      },
      "openingHours": [],
      "businessHours": [
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "monday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "20:00",
              "startTime": "10:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "tuesday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "20:00",
              "startTime": "10:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "wednesday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "20:00",
              "startTime": "10:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "thursday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "20:00",
              "startTime": "10:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "friday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "20:00",
              "startTime": "10:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "saturday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "18:00",
              "startTime": "10:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": true,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "sunday",
          "breakSlots": null,
          "operatingSlots": [],
          "effectivePeriod": null
        }
      ],
      "imageUrls": [
        "https://example.com/images/salon1-1.jpg",
        "https://example.com/images/salon1-2.jpg"
      ],
      "features": [
        "Hair Styling",
        "Hair Color",
        "Treatment",
        "Head Spa"
      ],
      "rating": 4.8,
      "reviewCount": 324,
      "createdAt": "2025-09-30 13:41:11.394486+00",
      "createdBy": "Demo user",
      "updatedAt": "2025-09-30 13:41:11.394486+00",
      "updatedBy": "Demo user"
    },
    {
      "id": "80ce1134-1c82-4831-94d9-2e17fc08cdc7",
      "name": "Hair & Spa Osaka",
      "description": "Relaxing hair salon and spa in Osaka",
      "address": {
        "street": "4-5-6 Namba",
        "city": "Naniwa-ku",
        "prefecture": "Osaka",
        "postalCode": "556-0011",
        "country": "Japan"
      },
      "contactInfo": {
        "phoneNumber": "+81-6-9876-5432",
        "alternativePhone": null,
        "email": "contact@hairspa-osaka.jp",
        "websiteUrl": "https://hairspa-osaka.jp"
      },
      "openingHours": [],
      "businessHours": [
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "monday",
          "breakSlots": [
            {
              "endTime": "14:00",
              "startTime": "13:00"
            }
          ],
          "operatingSlots": [
            {
              "endTime": "19:00",
              "startTime": "09:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "tuesday",
          "breakSlots": [
            {
              "endTime": "14:00",
              "startTime": "13:00"
            }
          ],
          "operatingSlots": [
            {
              "endTime": "19:00",
              "startTime": "09:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": true,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "wednesday",
          "breakSlots": null,
          "operatingSlots": [],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "thursday",
          "breakSlots": [
            {
              "endTime": "14:00",
              "startTime": "13:00"
            }
          ],
          "operatingSlots": [
            {
              "endTime": "19:00",
              "startTime": "09:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "friday",
          "breakSlots": [
            {
              "endTime": "14:00",
              "startTime": "13:00"
            }
          ],
          "operatingSlots": [
            {
              "endTime": "19:00",
              "startTime": "09:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "saturday",
          "breakSlots": [
            {
              "endTime": "14:00",
              "startTime": "13:00"
            }
          ],
          "operatingSlots": [
            {
              "endTime": "19:00",
              "startTime": "09:00"
            }
          ],
          "effectivePeriod": null
        },
        {
          "isClosed": false,
          "timezone": "Asia/Tokyo",
          "dayOfWeek": "sunday",
          "breakSlots": null,
          "operatingSlots": [
            {
              "endTime": "17:00",
              "startTime": "09:00"
            }
          ],
          "effectivePeriod": null
        }
      ],
      "imageUrls": [
        "https://example.com/images/salon2-1.jpg",
        "https://example.com/images/salon2-2.jpg",
        "https://example.com/images/salon2-3.jpg"
      ],
      "features": [
        "Hair Cut",
        "Spa",
        "Color",
        "Perm",
        "Treatment"
      ],
      "rating": 4.6,
      "reviewCount": 189,
      "createdAt": "2025-09-30 13:41:11.394486+00",
      "createdBy": "Demo user",
      "updatedAt": "2025-09-30 13:41:11.394486+00",
      "updatedBy": "Demo user"
    }
  ],
  "meta": {
    "total": 3,
    "limit": 20,
    "hasMore": false,
    "cursor": null,
    "nextCursor": null,
    "prevCursor": null
  },
  "links": {
    "self": "?limit=20&offset=0",
    "first": "?limit=20&offset=0",
    "last": "?limit=20&offset=0",
    "next": null,
    "prev": null
  }
} | jq
```