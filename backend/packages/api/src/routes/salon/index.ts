import { Router } from 'express'

// Import all handlers
import { createSalonHandler } from './create-salon.handler'
import { deleteSalonHandler } from './delete-salon.handler'
import { getSalonHandler } from './get-salon.handler'
import { listSalonsHandler } from './list-salons.handler'
import { searchSalonsHandler } from './search-salons.handler'
import { updateSalonHandler } from './update-salon.handler'

/**
 * Salon Routes Configuration
 *
 * This module aggregates all salon-related routes and handlers.
 * Each handler is in its own file for better maintainability.
 *
 * Routes:
 * - GET    /api/v1/salons          → listSalonsHandler    (List all salons with pagination)
 * - POST   /api/v1/salons          → createSalonHandler   (Create a new salon)
 * - GET    /api/v1/salons/search   → searchSalonsHandler  (Search salons with filters)
 * - GET    /api/v1/salons/:id      → getSalonHandler      (Get single salon by ID)
 * - PUT    /api/v1/salons/:id      → updateSalonHandler   (Update existing salon)
 * - DELETE /api/v1/salons/:id      → deleteSalonHandler   (Soft delete salon)
 */
const router = Router()

// List and Create operations
router.get('/salons', listSalonsHandler)
router.post('/salons', createSalonHandler)

// Search operation (before :id to avoid route conflicts)
router.get('/salons/search', searchSalonsHandler)

// Single resource operations
router.get('/salons/:id', getSalonHandler)
router.put('/salons/:id', updateSalonHandler)
router.delete('/salons/:id', deleteSalonHandler)

export default router
