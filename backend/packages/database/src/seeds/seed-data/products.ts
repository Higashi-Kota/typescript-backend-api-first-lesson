import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../schema'

export interface ProductSeedResult {
  productIds: string[]
  productMap: Record<string, string[]> // salonId -> productIds
}

export async function seedProducts(
  db: PostgresJsDatabase<typeof schema>,
  salonIds: string[]
): Promise<ProductSeedResult> {
  const products = []

  const salonId1 = salonIds[0]
  const salonId2 = salonIds[1]

  if (!(salonId1 && salonId2)) {
    throw new Error('At least 2 salon IDs required for products seeding')
  }

  // Products for Salon 1
  products.push(
    // Hair care products
    {
      salonId: salonId1,
      productCode: 'SHMP001',
      name: 'Professional Shampoo 500ml',
      description: 'Salon-grade moisturizing shampoo for all hair types',
      category: 'Hair Care',
      brand: 'Salon Pro',
      purchasePrice: 1500,
      retailPrice: 3500,
      salonPrice: 3000,
      unit: 'bottle',
      minimumStock: '5',
      maximumStock: '50',
      reorderPoint: '10',
      imageUrl: '/images/products/shampoo-001.jpg',
      barcode: '4901234567890',
      isForSale: true,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 36,
      storageConditions: 'Store in cool, dry place',
      isActive: true,
    },
    {
      salonId: salonId1,
      productCode: 'COND001',
      name: 'Professional Conditioner 500ml',
      description: 'Deep conditioning treatment for damaged hair',
      category: 'Hair Care',
      brand: 'Salon Pro',
      purchasePrice: 1500,
      retailPrice: 3500,
      salonPrice: 3000,
      unit: 'bottle',
      minimumStock: '5',
      maximumStock: '50',
      reorderPoint: '10',
      barcode: '4901234567891',
      isForSale: true,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 36,
      isActive: true,
    },
    {
      salonId: salonId1,
      productCode: 'TREAT001',
      name: 'Intensive Hair Mask 250ml',
      description: 'Weekly intensive treatment for dry and damaged hair',
      category: 'Hair Treatment',
      brand: 'Salon Pro',
      purchasePrice: 2000,
      retailPrice: 4500,
      salonPrice: 4000,
      unit: 'jar',
      minimumStock: '3',
      maximumStock: '30',
      reorderPoint: '5',
      barcode: '4901234567892',
      isForSale: true,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 24,
      isActive: true,
    },

    // Hair color products
    {
      salonId: salonId1,
      productCode: 'COLOR001',
      name: 'Hair Color - Natural Brown',
      description: 'Professional hair color with ammonia-free formula',
      category: 'Hair Color',
      brand: 'ColorTech',
      purchasePrice: 800,
      retailPrice: 2000,
      salonPrice: 1800,
      unit: 'tube',
      minimumStock: '10',
      maximumStock: '100',
      reorderPoint: '20',
      barcode: '4901234567893',
      isForSale: false,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 18,
      storageConditions: 'Store away from direct sunlight',
      safetyDataSheet: '/docs/sds/color-001.pdf',
      isActive: true,
    },
    {
      salonId: salonId1,
      productCode: 'BLEACH001',
      name: 'Lightening Powder 500g',
      description: 'Professional bleaching powder for highlights',
      category: 'Hair Color',
      brand: 'ColorTech',
      purchasePrice: 1200,
      retailPrice: 3000,
      salonPrice: 2800,
      unit: 'box',
      minimumStock: '5',
      maximumStock: '30',
      reorderPoint: '8',
      barcode: '4901234567894',
      isForSale: false,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 24,
      storageConditions: 'Keep in airtight container',
      safetyDataSheet: '/docs/sds/bleach-001.pdf',
      isActive: true,
    },
    {
      salonId: salonId1,
      productCode: 'DEVELOPER001',
      name: 'Developer 6% 1000ml',
      description: 'Hydrogen peroxide developer for hair color',
      category: 'Hair Color',
      brand: 'ColorTech',
      purchasePrice: 500,
      retailPrice: 1200,
      salonPrice: 1000,
      unit: 'bottle',
      minimumStock: '10',
      maximumStock: '50',
      reorderPoint: '15',
      barcode: '4901234567895',
      isForSale: false,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 12,
      storageConditions: 'Store in cool place, avoid heat',
      safetyDataSheet: '/docs/sds/developer-001.pdf',
      isActive: true,
    },

    // Styling products
    {
      salonId: salonId1,
      productCode: 'WAX001',
      name: 'Styling Wax 80g',
      description: 'Medium hold styling wax for all hair types',
      category: 'Styling',
      brand: 'Style Master',
      purchasePrice: 800,
      retailPrice: 2000,
      salonPrice: 1800,
      unit: 'jar',
      minimumStock: '5',
      maximumStock: '40',
      reorderPoint: '10',
      barcode: '4901234567896',
      isForSale: true,
      isForTreatment: false,
      requiresLotTracking: false,
      expiryMonths: 36,
      isActive: true,
    }
  )

  // Products for Salon 2 (Spa focused)
  products.push(
    {
      salonId: salonId2,
      productCode: 'SPA001',
      name: 'Scalp Treatment Oil 100ml',
      description: 'Aromatherapy oil for scalp massage',
      category: 'Spa',
      brand: 'Spa Essence',
      purchasePrice: 2000,
      retailPrice: 5000,
      salonPrice: 4500,
      unit: 'bottle',
      minimumStock: '3',
      maximumStock: '20',
      reorderPoint: '5',
      barcode: '4901234567897',
      isForSale: true,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 24,
      storageConditions: 'Store in dark place at room temperature',
      isActive: true,
    },
    {
      salonId: salonId2,
      productCode: 'SPA002',
      name: 'Relaxing Head Spa Cream 250ml',
      description: 'Cooling cream for head spa treatments',
      category: 'Spa',
      brand: 'Spa Essence',
      purchasePrice: 1800,
      retailPrice: 4000,
      salonPrice: 3600,
      unit: 'jar',
      minimumStock: '5',
      maximumStock: '30',
      reorderPoint: '8',
      barcode: '4901234567898',
      isForSale: false,
      isForTreatment: true,
      requiresLotTracking: true,
      expiryMonths: 18,
      isActive: true,
    }
  )

  const insertedProducts = await db
    .insert(schema.products)
    .values(products)
    .returning({
      id: schema.products.id,
      salonId: schema.products.salonId,
    })

  // Create initial inventory for products
  const inventory = []
  for (const product of insertedProducts.slice(0, 6)) {
    // First 6 products
    inventory.push({
      salonId: product.salonId,
      productId: product.id,
      currentStock: '20.00',
      availableStock: '18.00',
      reservedStock: '2.00',
      lotNumber: `LOT-2024-${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`,
      expiryDate: '2025-12-31',
      location: 'Storage Room A',
      shelf: `A-${Math.floor(Math.random() * 10) + 1}`,
    })
  }

  if (inventory.length > 0) {
    await db.insert(schema.inventory).values(inventory)
  }

  // Build product map
  const productMap: Record<string, string[]> = {}
  for (const product of insertedProducts) {
    if (!productMap[product.salonId]) {
      productMap[product.salonId] = []
    }
    const productList = productMap[product.salonId]
    if (productList) {
      productList.push(product.id)
    }
  }

  return {
    productIds: insertedProducts.map((p) => p.id),
    productMap,
  }
}
