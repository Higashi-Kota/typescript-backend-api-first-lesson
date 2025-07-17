import type { 
  BookingId, CustomerId, ReservationId, ReviewId, SalonId, ServiceId, StaffId 
} from './brand-types';
import type { 
  DayOfWeek, ServiceCategory, ReservationStatus, BookingStatus 
} from './schemas';

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ContactInfo {
  email: string;
  phoneNumber: string;
  alternativePhone?: string;
}

export interface AuditInfo {
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface OpeningHours {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isHoliday: boolean;
}

export interface Salon extends AuditInfo {
  id: SalonId;
  name: string;
  description?: string;
  address: Address;
  contactInfo: ContactInfo;
  openingHours: OpeningHours[];
  images?: string[];
  isActive: boolean;
}

export interface Customer extends AuditInfo {
  id: CustomerId;
  name: string;
  contactInfo: ContactInfo;
  preferences?: string;
  notes?: string;
  tags?: string[];
  loyaltyPoints?: number;
  membershipLevel?: string;
  birthDate?: string;
}

export interface Staff extends AuditInfo {
  id: StaffId;
  salonId: SalonId;
  name: string;
  contactInfo: ContactInfo;
  specialties?: string[];
  bio?: string;
  imageUrl?: string;
  isActive: boolean;
  workingHours?: OpeningHours[];
}

export interface Service extends AuditInfo {
  id: ServiceId;
  salonId: SalonId;
  name: string;
  description?: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  isActive: boolean;
  requiredStaffLevel?: string;
  allowParallelBooking: boolean;
}

export interface Reservation extends AuditInfo {
  id: ReservationId;
  salonId: SalonId;
  customerId: CustomerId;
  staffId: StaffId;
  serviceId: ServiceId;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  notes?: string;
  totalAmount: number;
}

export interface Booking extends AuditInfo {
  id: BookingId;
  salonId: SalonId;
  customerId: CustomerId;
  reservationIds: ReservationId[];
  status: BookingStatus;
  totalAmount: number;
  finalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paidAt?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  notes?: string;
}

export interface Review extends AuditInfo {
  id: ReviewId;
  salonId: SalonId;
  customerId: CustomerId;
  bookingId?: BookingId;
  reservationId?: ReservationId;
  rating: number;
  title?: string;
  comment?: string;
  reply?: string;
  repliedAt?: string;
  isPublished: boolean;
  publishedAt?: string;
  images?: string[];
}

// Request/Response types
export interface CreateCustomerRequest {
  name: string;
  contactInfo: ContactInfo;
  preferences?: string;
  notes?: string;
  tags?: string[];
  birthDate?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  contactInfo?: ContactInfo;
  preferences?: string;
  notes?: string;
  tags?: string[];
  birthDate?: string;
}

export interface CreateSalonRequest {
  name: string;
  description?: string;
  address: Address;
  contactInfo: ContactInfo;
  openingHours: OpeningHours[];
  images?: string[];
}

export interface UpdateSalonRequest {
  name?: string;
  description?: string;
  address?: Address;
  contactInfo?: ContactInfo;
  openingHours?: OpeningHours[];
  images?: string[];
  isActive?: boolean;
}

export interface CreateStaffRequest {
  salonId: SalonId;
  name: string;
  contactInfo: ContactInfo;
  specialties?: string[];
  bio?: string;
  imageUrl?: string;
  workingHours?: OpeningHours[];
}

export interface UpdateStaffRequest {
  name?: string;
  contactInfo?: ContactInfo;
  specialties?: string[];
  bio?: string;
  imageUrl?: string;
  isActive?: boolean;
  workingHours?: OpeningHours[];
}

export interface CreateServiceRequest {
  salonId: SalonId;
  name: string;
  description?: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  requiredStaffLevel?: string;
  allowParallelBooking?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  category?: ServiceCategory;
  duration?: number;
  price?: number;
  isActive?: boolean;
  requiredStaffLevel?: string;
  allowParallelBooking?: boolean;
}

export interface CreateReservationRequest {
  salonId: SalonId;
  customerId: CustomerId;
  staffId: StaffId;
  serviceId: ServiceId;
  startTime: string;
  notes?: string;
}

export interface UpdateReservationRequest {
  status?: ReservationStatus;
  notes?: string;
  startTime?: string;
}

export interface CreateBookingRequest {
  salonId: SalonId;
  customerId: CustomerId;
  reservationIds: ReservationId[];
  notes?: string;
}

export interface UpdateBookingRequest {
  status?: BookingStatus;
  paymentMethod?: string;
  notes?: string;
}

export interface CreateReviewRequest {
  salonId: SalonId;
  customerId: CustomerId;
  bookingId?: BookingId;
  reservationId?: ReservationId;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
  images?: string[];
  isPublished?: boolean;
}