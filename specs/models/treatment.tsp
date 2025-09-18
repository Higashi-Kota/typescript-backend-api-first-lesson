import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("Treatment record for customer visit")
  model TreatmentRecord {
    id: TreatmentRecordId;
    bookingId: BookingId;
    customerId: CustomerId;
    staffId: StaffId;
    salonId: SalonId;
    
    @doc("Type of treatment performed")
    treatmentType: TreatmentType;
    
    @doc("Services performed during this treatment")
    serviceIds: ServiceId[];
    
    @doc("Treatment start time")
    startTime: utcDateTime;
    
    @doc("Treatment end time")
    endTime: utcDateTime;
    
    @doc("Detailed notes about the treatment")
    notes?: string;
    
    @doc("Materials and products used")
    usedMaterials?: MaterialUsage[];
    
    @doc("Before/after photos")
    photos?: AttachmentId[];
    
    @doc("Customer feedback and notes")
    customerFeedback?: string;
    
    @doc("Recommendations for next visit")
    nextRecommendations?: string;
    
    @doc("Total amount charged")
    totalAmount: float32;
    
    @doc("Discount applied")
    discountAmount?: float32;
    
    @doc("Points earned")
    pointsEarned?: int32;
    
    ...AuditInfo;
  }

  @doc("Material usage record")
  model MaterialUsage {
    inventoryId: InventoryId;
    productName: string;
    quantity: float32;
    unit: string;
    notes?: string;
  }

  @doc("Medical chart for customer")
  model MedicalChart {
    id: MedicalChartId;
    customerId: CustomerId;
    
    @doc("Allergies and sensitivities")
    allergies?: string[];
    
    @doc("Scalp condition")
    scalpCondition?: string;
    
    @doc("Hair condition")
    hairCondition?: string;
    
    @doc("Previous chemical treatments")
    previousTreatments?: PreviousTreatment[];
    
    @doc("Medical conditions to be aware of")
    medicalConditions?: string;
    
    @doc("Preferred products")
    preferredProducts?: string[];
    
    @doc("Products to avoid")
    avoidProducts?: string[];
    
    @doc("General notes")
    notes?: string;
    
    @doc("Last updated date")
    lastUpdated: utcDateTime;
    
    ...AuditInfo;
  }

  @doc("Previous treatment history")
  model PreviousTreatment {
    treatmentType: TreatmentType;
    date: utcDateTime;
    salonName?: string;
    notes?: string;
  }

  // Input/Output models
  model TreatmentRecordCreateInput {
    bookingId: BookingId;
    customerId: CustomerId;
    staffId: StaffId;
    treatmentType: TreatmentType;
    serviceIds: ServiceId[];
    startTime: utcDateTime;
    endTime: utcDateTime;
    notes?: string;
    usedMaterials?: MaterialUsage[];
    customerFeedback?: string;
    nextRecommendations?: string;
    totalAmount: float32;
    discountAmount?: float32;
    pointsEarned?: int32;
  }

  model TreatmentRecordUpdateInput {
    notes?: string;
    usedMaterials?: MaterialUsage[];
    customerFeedback?: string;
    nextRecommendations?: string;
    photos?: AttachmentId[];
  }

  model MedicalChartCreateInput {
    customerId: CustomerId;
    allergies?: string[];
    scalpCondition?: string;
    hairCondition?: string;
    previousTreatments?: PreviousTreatment[];
    medicalConditions?: string;
    preferredProducts?: string[];
    avoidProducts?: string[];
    notes?: string;
  }

  model MedicalChartUpdateInput {
    allergies?: string[];
    scalpCondition?: string;
    hairCondition?: string;
    previousTreatments?: PreviousTreatment[];
    medicalConditions?: string;
    preferredProducts?: string[];
    avoidProducts?: string[];
    notes?: string;
  }
}