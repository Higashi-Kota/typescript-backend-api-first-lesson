import "@typespec/http";
import "@typespec/rest";
import "../models/_shared/common.tsp";
import "../models/treatment.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using BeautySalon.Models;

namespace BeautySalon.Operations {
  @route("/treatments")
  @tag("Treatments")
  interface TreatmentOperations {
    @doc("List treatment records with filters")
    @get
    listTreatments(
      @query salonId?: SalonId,
      @query customerId?: CustomerId,
      @query staffId?: StaffId,
      @query treatment?: TreatmentType,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<TreatmentRecord>>;

    @doc("Get treatment record by ID")
    @get
    @route("/{id}")
    getTreatment(@path id: TreatmentRecordId): Result<TreatmentRecord>;

    @doc("Create new treatment record")
    @post
    createTreatment(
      @body treatment: TreatmentRecordCreateInput,
    ): Result<TreatmentRecord>;

    @doc("Update treatment record")
    @patch(#{ implicitOptionality: true })
    @route("/{id}")
    updateTreatment(
      @path id: TreatmentRecordId,
      @body updates: TreatmentRecordUpdateInput,
    ): Result<TreatmentRecord>;

    @doc("Delete treatment record")
    @delete
    @route("/{id}")
    deleteTreatment(@path id: TreatmentRecordId): Result<{}>;

    @doc("Get treatment history for a customer")
    @get
    @route("/customer/{customerId}/history")
    getCustomerTreatmentHistory(
      @path customerId: CustomerId,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<TreatmentRecord>>;

    @doc("Get treatments by staff member")
    @get
    @route("/staff/{staffId}")
    getStaffTreatments(
      @path staffId: StaffId,
      ...DateRangeFilter,
      ...PaginationParams,
    ): Result<PaginationResponse<TreatmentRecord>>;

    @doc("Add photos to treatment record")
    @post
    @route("/{id}/photos")
    addTreatmentPhotos(
      @path id: TreatmentRecordId,
      @body photos: AttachmentId[],
    ): Result<TreatmentRecord>;

    @doc("Get treatment statistics")
    @get
    @route("/statistics")
    getTreatmentStatistics(
      @query salonId: SalonId,
      ...DateRangeFilter,
    ): Result<{
      totalTreatments: int32;
      treatmentsBy: Record<int32>;
      averageDuration: float32;
      topServices: ServiceId[];
    }>;
  }

  @route("/medical-charts")
  @tag("Medical Charts")
  interface MedicalChartOperations {
    @doc("Get medical chart by customer ID")
    @get
    @route("/customer/{customerId}")
    getCustomerMedicalChart(@path customerId: CustomerId): Result<MedicalChart>;

    @doc("Create medical chart for customer")
    @post
    createMedicalChart(
      @body chart: MedicalChartCreateInput,
    ): Result<MedicalChart>;

    @doc("Update medical chart")
    @patch(#{ implicitOptionality: true })
    @route("/{id}")
    updateMedicalChart(
      @path id: MedicalChartId,
      @body updates: MedicalChartUpdateInput,
    ): Result<MedicalChart>;

    @doc("Get allergy warnings for customer")
    @get
    @route("/customer/{customerId}/allergies")
    getCustomerAllergies(@path customerId: CustomerId): Result<{
      customerId: CustomerId;
      allergies: string[];
      avoidProducts: string[];
      lastUpdated: utcDateTime;
    }>;

    @doc("Search medical charts")
    @get
    searchMedicalCharts(
      @query search?: string,
      @query hasAllergies?: boolean,
      ...PaginationParams,
    ): Result<PaginationResponse<MedicalChart>>;
  }
}
