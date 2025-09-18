-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."allergy_type" AS ENUM('chemical', 'fragrance', 'metal', 'latex', 'plant', 'other');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."inventory_transaction_type" AS ENUM('purchase', 'sale', 'use', 'adjustment', 'return', 'disposal', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."membership_tier" AS ENUM('regular', 'silver', 'gold', 'platinum', 'vip');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('booking_reminder', 'booking_confirmation', 'booking_change', 'promotion', 'birthday', 'points_expiry', 'review_request');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'credit_card', 'debit_card', 'e_money', 'qr_payment', 'bank_transfer', 'point');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partial');--> statement-breakpoint
CREATE TYPE "public"."point_transaction_type" AS ENUM('earned', 'used', 'expired', 'adjusted', 'transferred');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('cut', 'color', 'perm', 'treatment', 'spa', 'styling', 'extension', 'other');--> statement-breakpoint
CREATE TYPE "public"."staff_level" AS ENUM('junior', 'stylist', 'senior', 'expert', 'director');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'staff', 'manager', 'admin', 'owner');--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipientId" uuid NOT NULL,
	"recipientType" varchar(20) NOT NULL,
	"notificationType" "notification_type" NOT NULL,
	"channel" varchar(20) NOT NULL,
	"subject" varchar(255),
	"content" text NOT NULL,
	"templateId" varchar(100),
	"variables" jsonb,
	"status" varchar(20) NOT NULL,
	"sentAt" timestamp with time zone,
	"deliveredAt" timestamp with time zone,
	"failedAt" timestamp with time zone,
	"errorMessage" text,
	"referenceType" varchar(50),
	"referenceId" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid,
	"firstName" varchar(100) NOT NULL,
	"lastName" varchar(100) NOT NULL,
	"firstNameKana" varchar(100),
	"lastNameKana" varchar(100),
	"email" varchar(255) NOT NULL,
	"phoneNumber" varchar(20) NOT NULL,
	"alternativePhone" varchar(20),
	"postalCode" varchar(10),
	"prefecture" varchar(50),
	"city" varchar(100),
	"address" varchar(255),
	"building" varchar(255),
	"birthDate" date,
	"gender" varchar(20),
	"occupation" varchar(100),
	"membershipTier" "membership_tier" DEFAULT 'regular' NOT NULL,
	"loyaltyPoints" integer DEFAULT 0 NOT NULL,
	"lifetimeValue" integer DEFAULT 0 NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"internalNotes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"referredBy" uuid,
	"referralCode" varchar(50),
	"allowMarketing" boolean DEFAULT true NOT NULL,
	"allowSms" boolean DEFAULT true NOT NULL,
	"allowEmail" boolean DEFAULT true NOT NULL,
	"firstVisitDate" date,
	"lastVisitDate" date,
	"visitCount" integer DEFAULT 0 NOT NULL,
	"noShowCount" integer DEFAULT 0 NOT NULL,
	"cancellationCount" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email"),
	CONSTRAINT "customers_referral_code_unique" UNIQUE("referralCode")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookingNumber" varchar(50) NOT NULL,
	"salonId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"staffId" uuid NOT NULL,
	"bookingDate" date NOT NULL,
	"startTime" timestamp with time zone NOT NULL,
	"endTime" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"subtotal" integer NOT NULL,
	"discountAmount" integer DEFAULT 0 NOT NULL,
	"taxAmount" integer DEFAULT 0 NOT NULL,
	"totalAmount" integer NOT NULL,
	"depositAmount" integer DEFAULT 0,
	"pointsUsed" integer DEFAULT 0,
	"pointsEarned" integer DEFAULT 0,
	"customerRequest" text,
	"internalNotes" text,
	"reminderSent" boolean DEFAULT false NOT NULL,
	"reminderSentAt" timestamp with time zone,
	"cancelledAt" timestamp with time zone,
	"cancelledBy" uuid,
	"cancellationReason" text,
	"cancellationFee" integer DEFAULT 0,
	"completedAt" timestamp with time zone,
	"actualStartTime" timestamp with time zone,
	"actualEndTime" timestamp with time zone,
	"source" varchar(50),
	"ipAddress" varchar(50),
	"userAgent" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_booking_number_unique" UNIQUE("bookingNumber")
);
--> statement-breakpoint
CREATE TABLE "booking_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookingId" uuid NOT NULL,
	"serviceId" uuid NOT NULL,
	"staffId" uuid,
	"startTime" timestamp with time zone NOT NULL,
	"endTime" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"discountAmount" integer DEFAULT 0 NOT NULL,
	"finalPrice" integer NOT NULL,
	"selectedOptions" jsonb DEFAULT '[]'::jsonb,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp with time zone,
	"notes" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"categoryId" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"shortDescription" varchar(500),
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"discountPrice" integer,
	"taxIncluded" boolean DEFAULT true NOT NULL,
	"imageUrl" varchar(500),
	"imageUrls" jsonb DEFAULT '[]'::jsonb,
	"requiredStaffLevel" "staff_level",
	"maxBookingsPerDay" integer,
	"requiresConsultation" boolean DEFAULT false NOT NULL,
	"allowOnlineBooking" boolean DEFAULT true NOT NULL,
	"isPackage" boolean DEFAULT false NOT NULL,
	"packageServiceIds" jsonb DEFAULT '[]'::jsonb,
	"requiredProducts" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"userId" uuid,
	"firstName" varchar(100) NOT NULL,
	"lastName" varchar(100) NOT NULL,
	"firstNameKana" varchar(100),
	"lastNameKana" varchar(100),
	"displayName" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phoneNumber" varchar(20) NOT NULL,
	"alternativePhone" varchar(20),
	"staffCode" varchar(50),
	"level" "staff_level" DEFAULT 'stylist' NOT NULL,
	"position" varchar(100),
	"specialties" jsonb DEFAULT '[]'::jsonb,
	"bio" text,
	"imageUrl" varchar(500),
	"yearsOfExperience" integer DEFAULT 0,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"awards" jsonb DEFAULT '[]'::jsonb,
	"hireDate" date,
	"employmentType" varchar(50),
	"baseSalary" integer,
	"commissionRate" numeric(5, 2),
	"canReceiveBookings" boolean DEFAULT true NOT NULL,
	"maxConcurrentBookings" integer DEFAULT 1 NOT NULL,
	"bufferTimeBefore" integer DEFAULT 0,
	"bufferTimeAfter" integer DEFAULT 0,
	"isActive" boolean DEFAULT true NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_code_salon_unique" UNIQUE("salonId","staffCode"),
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "booking_status_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookingId" uuid NOT NULL,
	"fromStatus" "booking_status",
	"toStatus" "booking_status" NOT NULL,
	"changedBy" uuid,
	"reason" text,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"nameKana" varchar(255),
	"description" text,
	"postalCode" varchar(10),
	"prefecture" varchar(50) NOT NULL,
	"city" varchar(100) NOT NULL,
	"address" varchar(255) NOT NULL,
	"building" varchar(255),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"phoneNumber" varchar(20) NOT NULL,
	"alternativePhone" varchar(20),
	"email" varchar(255) NOT NULL,
	"websiteUrl" varchar(500),
	"logoUrl" varchar(500),
	"imageUrls" jsonb DEFAULT '[]'::jsonb,
	"features" jsonb DEFAULT '[]'::jsonb,
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"timezone" varchar(50) DEFAULT 'Asia/Tokyo' NOT NULL,
	"currency" varchar(3) DEFAULT 'JPY' NOT NULL,
	"taxRate" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"cancellationPolicy" jsonb,
	"bookingPolicy" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salons_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customer_allergies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"allergyType" "allergy_type" NOT NULL,
	"allergenName" varchar(255) NOT NULL,
	"severity" integer DEFAULT 3 NOT NULL,
	"symptoms" text,
	"notes" text,
	"confirmedDate" date,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"transactionType" "point_transaction_type" NOT NULL,
	"points" integer NOT NULL,
	"balance" integer NOT NULL,
	"description" text,
	"referenceType" varchar(50),
	"referenceId" uuid,
	"expiryDate" date,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerId" uuid NOT NULL,
	"preferredStaffId" uuid,
	"preferredTimeSlots" jsonb DEFAULT '[]'::jsonb,
	"avoidStaffIds" jsonb DEFAULT '[]'::jsonb,
	"preferredServices" jsonb DEFAULT '[]'::jsonb,
	"stylePreferences" jsonb DEFAULT '{}'::jsonb,
	"communicationStyle" varchar(100),
	"specialRequests" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_preferences_unique" UNIQUE("customerId")
);
--> statement-breakpoint
CREATE TABLE "daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"summaryDate" date NOT NULL,
	"totalBookings" integer DEFAULT 0 NOT NULL,
	"completedBookings" integer DEFAULT 0 NOT NULL,
	"cancelledBookings" integer DEFAULT 0 NOT NULL,
	"noShowBookings" integer DEFAULT 0 NOT NULL,
	"uniqueCustomers" integer DEFAULT 0 NOT NULL,
	"newCustomers" integer DEFAULT 0 NOT NULL,
	"returningCustomers" integer DEFAULT 0 NOT NULL,
	"totalSales" integer DEFAULT 0 NOT NULL,
	"serviceSales" integer DEFAULT 0 NOT NULL,
	"productSales" integer DEFAULT 0 NOT NULL,
	"averageTicket" integer DEFAULT 0 NOT NULL,
	"activeStaff" integer DEFAULT 0 NOT NULL,
	"totalServiceHours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"utilizationRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"topService" jsonb,
	"topStaff" jsonb,
	"topProduct" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_summaries_unique" UNIQUE("salonId","summaryDate")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"productId" uuid NOT NULL,
	"currentStock" numeric(10, 2) NOT NULL,
	"availableStock" numeric(10, 2) NOT NULL,
	"reservedStock" numeric(10, 2) DEFAULT '0' NOT NULL,
	"lotNumber" varchar(100),
	"expiryDate" date,
	"location" varchar(100),
	"shelf" varchar(50),
	"lastCountedAt" timestamp with time zone,
	"lastCountedBy" uuid,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_unique" UNIQUE("salonId","productId","lotNumber")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"productCode" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"brand" varchar(100),
	"purchasePrice" integer,
	"retailPrice" integer,
	"salonPrice" integer,
	"unit" varchar(20) NOT NULL,
	"minimumStock" numeric(10, 2) DEFAULT '0',
	"maximumStock" numeric(10, 2),
	"reorderPoint" numeric(10, 2),
	"supplierId" uuid,
	"supplierProductCode" varchar(100),
	"leadTimeDays" integer,
	"imageUrl" varchar(500),
	"barcode" varchar(100),
	"isForSale" boolean DEFAULT false NOT NULL,
	"isForTreatment" boolean DEFAULT true NOT NULL,
	"requiresLotTracking" boolean DEFAULT false NOT NULL,
	"expiryMonths" integer,
	"storageConditions" text,
	"safetyDataSheet" varchar(500),
	"isActive" boolean DEFAULT true NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_salon_unique" UNIQUE("salonId","productCode")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"productId" uuid NOT NULL,
	"inventoryId" uuid,
	"transactionType" "inventory_transaction_type" NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"balanceBefore" numeric(10, 2) NOT NULL,
	"balanceAfter" numeric(10, 2) NOT NULL,
	"unitCost" integer,
	"totalCost" integer,
	"referenceType" varchar(50),
	"referenceId" uuid,
	"lotNumber" varchar(100),
	"expiryDate" date,
	"reason" text,
	"performedBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"tier" "membership_tier" NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"requiredPoints" integer DEFAULT 0 NOT NULL,
	"requiredAmount" integer DEFAULT 0 NOT NULL,
	"discountRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"pointMultiplier" numeric(3, 1) DEFAULT '1.0' NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb,
	"color" varchar(7),
	"iconUrl" varchar(500),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_tiers_unique" UNIQUE("salonId","tier")
);
--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"dayOfWeek" "day_of_week",
	"specificDate" date,
	"openTime" time,
	"closeTime" time,
	"isHoliday" boolean DEFAULT false NOT NULL,
	"holidayName" varchar(100),
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"displayName" varchar(100) NOT NULL,
	"description" text,
	"processorName" varchar(100),
	"processorConfig" jsonb,
	"fee" numeric(5, 2) DEFAULT '0',
	"minimumAmount" integer,
	"maximumAmount" integer,
	"isOnlineEnabled" boolean DEFAULT false NOT NULL,
	"isOfflineEnabled" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saleNumber" varchar(50) NOT NULL,
	"salonId" uuid NOT NULL,
	"customerId" uuid,
	"staffId" uuid,
	"bookingId" uuid,
	"saleDate" date NOT NULL,
	"saleTime" timestamp with time zone NOT NULL,
	"subtotal" integer NOT NULL,
	"discountAmount" integer DEFAULT 0 NOT NULL,
	"taxAmount" integer NOT NULL,
	"totalAmount" integer NOT NULL,
	"pointsUsed" integer DEFAULT 0,
	"pointsEarned" integer DEFAULT 0,
	"paymentStatus" "payment_status" DEFAULT 'pending' NOT NULL,
	"isVoid" boolean DEFAULT false NOT NULL,
	"voidedAt" timestamp with time zone,
	"voidReason" text,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_sale_number_unique" UNIQUE("saleNumber")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saleId" uuid NOT NULL,
	"paymentMethodId" uuid NOT NULL,
	"transactionNumber" varchar(100) NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status" NOT NULL,
	"processorTransactionId" varchar(255),
	"processorResponse" jsonb,
	"cardLastFour" varchar(4),
	"cardBrand" varchar(50),
	"errorCode" varchar(100),
	"errorMessage" text,
	"processedAt" timestamp with time zone,
	"failedAt" timestamp with time zone,
	"refundedAt" timestamp with time zone,
	"refundAmount" integer,
	"refundReason" text,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_transaction_number_unique" UNIQUE("transactionNumber")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"bookingId" uuid NOT NULL,
	"staffId" uuid,
	"overallRating" integer NOT NULL,
	"serviceRating" integer,
	"staffRating" integer,
	"atmosphereRating" integer,
	"cleanlinessRating" integer,
	"valueRating" integer,
	"title" varchar(255),
	"comment" text,
	"imageUrls" jsonb DEFAULT '[]'::jsonb,
	"isVerified" boolean DEFAULT false NOT NULL,
	"helpfulCount" integer DEFAULT 0 NOT NULL,
	"reportCount" integer DEFAULT 0 NOT NULL,
	"ownerResponse" text,
	"ownerRespondedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_unique" UNIQUE("bookingId")
);
--> statement-breakpoint
CREATE TABLE "sales_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saleId" uuid NOT NULL,
	"itemType" varchar(50) NOT NULL,
	"itemId" uuid,
	"itemName" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" integer NOT NULL,
	"discountAmount" integer DEFAULT 0 NOT NULL,
	"taxAmount" integer NOT NULL,
	"totalAmount" integer NOT NULL,
	"staffId" uuid,
	"commissionRate" numeric(5, 2),
	"commissionAmount" integer,
	"notes" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"salonId" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parentId" uuid,
	"category" "service_category" NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"iconUrl" varchar(500),
	"color" varchar(7),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serviceId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"additionalTime" integer DEFAULT 0 NOT NULL,
	"additionalPrice" integer DEFAULT 0 NOT NULL,
	"maxQuantity" integer DEFAULT 1 NOT NULL,
	"isRequired" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"passwordHash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"emailVerificationToken" varchar(255),
	"emailVerificationExpiry" timestamp with time zone,
	"passwordResetToken" varchar(255),
	"passwordResetExpiry" timestamp with time zone,
	"lastPasswordChange" timestamp with time zone,
	"passwordHistory" jsonb DEFAULT '[]'::jsonb,
	"twoFactorEnabled" boolean DEFAULT false NOT NULL,
	"twoFactorSecret" text,
	"backupCodes" jsonb,
	"failedLoginAttempts" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp with time zone,
	"lastLoginAt" timestamp with time zone,
	"lastLoginIp" varchar(50),
	"trustedIpAddresses" jsonb DEFAULT '[]'::jsonb,
	"customerId" uuid,
	"staffId" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"token" text NOT NULL,
	"refreshToken" text,
	"ipAddress" varchar(50) NOT NULL,
	"userAgent" text NOT NULL,
	"deviceId" varchar(255),
	"expiresAt" timestamp with time zone NOT NULL,
	"refreshExpiresAt" timestamp with time zone,
	"lastActivityAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token"),
	CONSTRAINT "sessions_refresh_token_unique" UNIQUE("refreshToken")
);
--> statement-breakpoint
CREATE TABLE "staff_performances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staffId" uuid NOT NULL,
	"periodStart" date NOT NULL,
	"periodEnd" date NOT NULL,
	"periodType" varchar(20) NOT NULL,
	"totalBookings" integer DEFAULT 0 NOT NULL,
	"completedBookings" integer DEFAULT 0 NOT NULL,
	"cancelledBookings" integer DEFAULT 0 NOT NULL,
	"rebookingRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"totalRevenue" integer DEFAULT 0 NOT NULL,
	"serviceRevenue" integer DEFAULT 0 NOT NULL,
	"productRevenue" integer DEFAULT 0 NOT NULL,
	"averageTicket" integer DEFAULT 0 NOT NULL,
	"commission" integer DEFAULT 0 NOT NULL,
	"totalHoursWorked" numeric(10, 2) DEFAULT '0' NOT NULL,
	"totalServiceHours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"utilizationRate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"uniqueCustomers" integer DEFAULT 0 NOT NULL,
	"newCustomers" integer DEFAULT 0 NOT NULL,
	"returningCustomers" integer DEFAULT 0 NOT NULL,
	"averageRating" numeric(3, 2),
	"reviewCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_performances_unique" UNIQUE("staffId","periodStart","periodType")
);
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staffId" uuid NOT NULL,
	"dayOfWeek" "day_of_week",
	"date" date,
	"startTime" time NOT NULL,
	"endTime" time NOT NULL,
	"breakStartTime" time,
	"breakEndTime" time,
	"isRecurring" boolean DEFAULT true NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staffId" uuid NOT NULL,
	"serviceId" uuid NOT NULL,
	"proficiencyLevel" integer DEFAULT 3 NOT NULL,
	"certificateDate" date,
	"certificateUrl" varchar(500),
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_skills_unique" UNIQUE("staffId","serviceId")
);
--> statement-breakpoint
CREATE TABLE "treatment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bookingId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"staffId" uuid NOT NULL,
	"services" jsonb NOT NULL,
	"techniques" jsonb DEFAULT '[]'::jsonb,
	"consultationNotes" text,
	"scalpCondition" jsonb,
	"hairCondition" jsonb,
	"colorFormula" jsonb,
	"processingTime" integer,
	"beforePhotos" jsonb DEFAULT '[]'::jsonb,
	"afterPhotos" jsonb DEFAULT '[]'::jsonb,
	"resultNotes" text,
	"nextRecommendedDate" date,
	"nextRecommendedServices" jsonb DEFAULT '[]'::jsonb,
	"homeCareSuggestions" text,
	"customerSatisfaction" integer,
	"staffEvaluation" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "treatment_records_booking_unique" UNIQUE("bookingId")
);
--> statement-breakpoint
CREATE TABLE "treatment_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treatmentRecordId" uuid NOT NULL,
	"productId" uuid NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"lotNumber" varchar(100),
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"treatmentRecordId" uuid NOT NULL,
	"photoType" varchar(20) NOT NULL,
	"photoUrl" varchar(500) NOT NULL,
	"thumbnailUrl" varchar(500),
	"angle" varchar(50),
	"description" text,
	"isPublic" boolean DEFAULT false NOT NULL,
	"customerConsent" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_referred_by_fk" FOREIGN KEY ("referredBy") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_booking_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_allergies" ADD CONSTRAINT "customer_allergies_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_points" ADD CONSTRAINT "customer_points_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_staff_id_fk" FOREIGN KEY ("preferredStaffId") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD CONSTRAINT "daily_summaries_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_id_fk" FOREIGN KEY ("inventoryId") REFERENCES "public"."inventory"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_tiers" ADD CONSTRAINT "membership_tiers_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_booking_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_sale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_method_id_fk" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."payment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_details" ADD CONSTRAINT "sales_details_sale_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_details" ADD CONSTRAINT "sales_details_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_salon_id_fk" FOREIGN KEY ("salonId") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."service_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_options" ADD CONSTRAINT "service_options_service_id_fk" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_performances" ADD CONSTRAINT "staff_performances_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_skills" ADD CONSTRAINT "staff_skills_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_booking_id_fk" FOREIGN KEY ("bookingId") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_staff_id_fk" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_materials" ADD CONSTRAINT "treatment_materials_treatment_record_id_fk" FOREIGN KEY ("treatmentRecordId") REFERENCES "public"."treatment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_materials" ADD CONSTRAINT "treatment_materials_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_photos" ADD CONSTRAINT "treatment_photos_treatment_record_id_fk" FOREIGN KEY ("treatmentRecordId") REFERENCES "public"."treatment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notification_logs_created_at" ON "notification_logs" USING btree ("createdAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_notification_logs_notification_type" ON "notification_logs" USING btree ("notificationType" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_notification_logs_recipient_id" ON "notification_logs" USING btree ("recipientId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_deleted_at" ON "customers" USING btree ("deletedAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_email" ON "customers" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_membership_tier" ON "customers" USING btree ("membershipTier" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_phone_number" ON "customers" USING btree ("phoneNumber" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_user_id" ON "customers" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_booking_date" ON "bookings" USING btree ("bookingDate" date_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_booking_number" ON "bookings" USING btree ("bookingNumber" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_customer_id" ON "bookings" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_salon_id" ON "bookings" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_staff_id" ON "bookings" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_start_time" ON "bookings" USING btree ("startTime" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_booking_services_booking_id" ON "booking_services" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_booking_services_service_id" ON "booking_services" USING btree ("serviceId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_booking_services_staff_id" ON "booking_services" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_services_category_id" ON "services" USING btree ("categoryId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_services_deleted_at" ON "services" USING btree ("deletedAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_services_salon_id" ON "services" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_deleted_at" ON "staff" USING btree ("deletedAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_email" ON "staff" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_salon_id" ON "staff" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_user_id" ON "staff" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_booking_status_histories_booking_id" ON "booking_status_histories" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_booking_status_histories_created_at" ON "booking_status_histories" USING btree ("createdAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_salons_deleted_at" ON "salons" USING btree ("deletedAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_salons_email" ON "salons" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_allergies_customer_id" ON "customer_allergies" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_points_created_at" ON "customer_points" USING btree ("createdAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_points_customer_id" ON "customer_points" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_points_expiry_date" ON "customer_points" USING btree ("expiryDate" date_ops);--> statement-breakpoint
CREATE INDEX "idx_customer_preferences_customer_id" ON "customer_preferences" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_daily_summaries_salon_id" ON "daily_summaries" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_daily_summaries_summary_date" ON "daily_summaries" USING btree ("summaryDate" date_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_expiry_date" ON "inventory" USING btree ("expiryDate" date_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_lot_number" ON "inventory" USING btree ("lotNumber" text_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_product_id" ON "inventory" USING btree ("productId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_salon_id" ON "inventory" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_products_barcode" ON "products" USING btree ("barcode" text_ops);--> statement-breakpoint
CREATE INDEX "idx_products_deleted_at" ON "products" USING btree ("deletedAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_products_product_code" ON "products" USING btree ("productCode" text_ops);--> statement-breakpoint
CREATE INDEX "idx_products_salon_id" ON "products" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_created_at" ON "inventory_transactions" USING btree ("createdAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_inventory_id" ON "inventory_transactions" USING btree ("inventoryId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_product_id" ON "inventory_transactions" USING btree ("productId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_salon_id" ON "inventory_transactions" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_transaction_type" ON "inventory_transactions" USING btree ("transactionType" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_membership_tiers_salon_id" ON "membership_tiers" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_opening_hours_salon_id" ON "opening_hours" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_opening_hours_specific_date" ON "opening_hours" USING btree ("specificDate" date_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_methods_salon_id" ON "payment_methods" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_booking_id" ON "sales" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_customer_id" ON "sales" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_sale_date" ON "sales" USING btree ("saleDate" date_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_sale_number" ON "sales" USING btree ("saleNumber" text_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_salon_id" ON "sales" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_staff_id" ON "sales" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_payment_method_id" ON "payment_transactions" USING btree ("paymentMethodId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_sale_id" ON "payment_transactions" USING btree ("saleId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_status" ON "payment_transactions" USING btree ("status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_payment_transactions_transaction_number" ON "payment_transactions" USING btree ("transactionNumber" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_booking_id" ON "reviews" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_customer_id" ON "reviews" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_overall_rating" ON "reviews" USING btree ("overallRating" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_salon_id" ON "reviews" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_reviews_staff_id" ON "reviews" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_details_sale_id" ON "sales_details" USING btree ("saleId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sales_details_staff_id" ON "sales_details" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_service_categories_parent_id" ON "service_categories" USING btree ("parentId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_service_categories_salon_id" ON "service_categories" USING btree ("salonId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_service_options_service_id" ON "service_options" USING btree ("serviceId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_users_customer_id" ON "users" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deletedAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE INDEX "idx_users_staff_id" ON "users" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_expires_at" ON "sessions" USING btree ("expiresAt" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_refresh_token" ON "sessions" USING btree ("refreshToken" text_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("userId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_performances_period_start" ON "staff_performances" USING btree ("periodStart" date_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_performances_period_type" ON "staff_performances" USING btree ("periodType" text_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_performances_staff_id" ON "staff_performances" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_schedules_date" ON "staff_schedules" USING btree ("date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_schedules_day_of_week" ON "staff_schedules" USING btree ("dayOfWeek" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_schedules_staff_id" ON "staff_schedules" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_skills_service_id" ON "staff_skills" USING btree ("serviceId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_staff_skills_staff_id" ON "staff_skills" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_records_booking_id" ON "treatment_records" USING btree ("bookingId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_records_customer_id" ON "treatment_records" USING btree ("customerId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_records_staff_id" ON "treatment_records" USING btree ("staffId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_materials_product_id" ON "treatment_materials" USING btree ("productId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_materials_treatment_record_id" ON "treatment_materials" USING btree ("treatmentRecordId" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_photos_photo_type" ON "treatment_photos" USING btree ("photoType" text_ops);--> statement-breakpoint
CREATE INDEX "idx_treatment_photos_treatment_record_id" ON "treatment_photos" USING btree ("treatmentRecordId" uuid_ops);