import { defineConfig } from 'orval'

export default defineConfig({
  beautySalon: {
    input: {
      target:
        '../../../specs/tsp-output/@typespec/openapi3/generated/openapi.yaml',
    },
    output: {
      clean: true,
      mode: 'tags-split',
      target: './src/generated/endpoints',
      schemas: './src/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      mock: false,
      override: {
        mutator: {
          path: '../io/src/libs/fetcher/fetcher.ts',
          name: 'customInstance',
        },
        operations: {
          // Salons
          SalonOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/salons': {
                  get: 'listSalons',
                  post: 'createSalon',
                },
                '/salons/{id}': {
                  get: 'getSalon',
                  put: 'updateSalon',
                  delete: 'deleteSalon',
                },
                '/salons/search': {
                  get: 'searchSalons',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
          // Staff
          StaffOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/salons/{salonId}/staff': {
                  get: 'listStaff',
                  post: 'createStaff',
                },
                '/salons/{salonId}/staff/{id}': {
                  get: 'getStaff',
                  put: 'updateStaff',
                  delete: 'deleteStaff',
                },
                '/salons/{salonId}/staff/{id}/availability': {
                  get: 'getStaffAvailability',
                  put: 'updateStaffAvailability',
                },
                '/staff/search': {
                  get: 'searchStaff',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
          // Services
          ServiceOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/salons/{salonId}/services': {
                  get: 'listServices',
                  post: 'createService',
                },
                '/salons/{salonId}/services/{id}': {
                  get: 'getService',
                  put: 'updateService',
                  delete: 'deleteService',
                },
                '/salons/{salonId}/services/bulk': {
                  patch: 'bulkUpdateServices',
                },
                '/service-categories': {
                  get: 'listServiceCategories',
                  post: 'createServiceCategory',
                },
                '/service-categories/{id}': {
                  put: 'updateServiceCategory',
                  delete: 'deleteServiceCategory',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
          // Customers
          CustomerOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/customers': {
                  get: 'listCustomers',
                  post: 'createCustomer',
                },
                '/customers/{id}': {
                  get: 'getCustomer',
                  put: 'updateCustomer',
                  delete: 'deleteCustomer',
                },
                '/customers/{id}/profile': {
                  get: 'getCustomerProfile',
                },
                '/customers/{id}/reservations': {
                  get: 'getCustomerReservations',
                },
                '/customers/{id}/bookings': {
                  get: 'getCustomerBookings',
                },
                '/customers/merge': {
                  post: 'mergeCustomers',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
          // Reservations
          ReservationOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/reservations': {
                  get: 'listReservations',
                  post: 'createReservation',
                },
                '/reservations/{id}': {
                  get: 'getReservation',
                  patch: 'updateReservation',
                },
                '/reservations/{id}/cancel': {
                  post: 'cancelReservation',
                },
                '/reservations/{id}/complete': {
                  post: 'completeReservation',
                },
                '/reservations/{id}/reschedule': {
                  post: 'rescheduleReservation',
                },
                '/salons/{salonId}/available-slots': {
                  get: 'getAvailableSlots',
                },
                '/salons/{salonId}/available-slots/check': {
                  post: 'checkAvailability',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
          // Bookings
          BookingOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/bookings': {
                  get: 'listBookings',
                  post: 'createBooking',
                },
                '/bookings/{id}': {
                  get: 'getBooking',
                  patch: 'updateBooking',
                  delete: 'deleteBooking',
                },
                '/bookings/{id}/confirm': {
                  post: 'confirmBooking',
                },
                '/bookings/{id}/cancel': {
                  post: 'cancelBooking',
                },
                '/bookings/{id}/payment': {
                  post: 'processBookingPayment',
                },
                '/bookings/{id}/reservations': {
                  post: 'addReservationToBooking',
                },
                '/bookings/{id}/reservations/{reservationId}': {
                  delete: 'removeReservationFromBooking',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
          // Reviews
          ReviewOperations: {
            operationName: (operation, route, verb) => {
              const baseNames: Record<string, Record<string, string>> = {
                '/reviews': {
                  get: 'listReviews',
                  post: 'createReview',
                },
                '/reviews/{id}': {
                  get: 'getReview',
                  patch: 'updateReview',
                  delete: 'deleteReview',
                },
                '/reviews/{id}/helpful': {
                  post: 'markReviewHelpful',
                },
                '/reviews/{id}/report': {
                  post: 'reportReview',
                },
                '/salons/{salonId}/reviews': {
                  get: 'getSalonReviews',
                },
                '/salons/{salonId}/reviews/summary': {
                  get: 'getSalonReviewsSummary',
                },
                '/staff/{staffId}/reviews': {
                  get: 'getStaffReviews',
                },
                '/staff/{staffId}/reviews/summary': {
                  get: 'getStaffReviewsSummary',
                },
              }
              return baseNames[route]?.[verb] || operation
            },
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'pnpm run format',
    },
  },
})
