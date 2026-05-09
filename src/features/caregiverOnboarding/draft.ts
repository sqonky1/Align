import type {
  CaregiverExtractionResult,
  CaregiverOnboardingDraftState,
  CaregiverProfileDraft,
  CaregiverProfileFieldPath,
  ExtractionAuditRecord,
  FieldReview,
  SourceMode,
} from "./types"
import { emptyCaregiverProfileDraft } from "./types"
import { validateCaregiverProfileDraft } from "./validation"

export function createEmptyOnboardingDraftState(): CaregiverOnboardingDraftState {
  return {
    mode: "manual",
    source_mode: "manual",
    values: structuredClone(emptyCaregiverProfileDraft),
    field_reviews: {},
    user_edited_fields: [],
    uploads: [],
    validation_issues: [],
    last_extracted_at: null,
  }
}

export function updateDraftValue(
  current: CaregiverOnboardingDraftState,
  fieldPath: string,
  value: unknown,
): CaregiverOnboardingDraftState {
  const nextValues = structuredClone(current.values)
  applyValueAtFieldPath(nextValues, fieldPath, value)
  const nextReview = current.field_reviews[fieldPath]
  const nextFieldReviews = nextReview
    ? {
        ...current.field_reviews,
        [fieldPath]: {
          ...nextReview,
          reviewed: true,
          requires_confirmation: false,
          source_mode: current.source_mode,
        },
      }
    : current.field_reviews

  const nextDraft = {
    ...current,
    values: nextValues,
    field_reviews: nextFieldReviews,
    user_edited_fields: addUniqueField(current.user_edited_fields, fieldPath),
  }

  return revalidateDraft(nextDraft)
}

export function mergeExtractionIntoDraft(
  current: CaregiverOnboardingDraftState,
  extraction: CaregiverExtractionResult,
  audit: ExtractionAuditRecord | null,
) {
  const nextValues = structuredClone(current.values)
  const nextFieldReviews: Record<string, FieldReview> = { ...current.field_reviews }

  for (const review of extraction.field_reviews) {
    const currentValue = getDraftValueByPath(nextValues, review.field_path)
    const incomingValue = review.value
    const isProtected = current.user_edited_fields.includes(review.field_path)
    const canFillEmpty = isEmptyDraftValue(currentValue) && !isEmptyDraftValue(incomingValue)

    if (!isProtected && (canFillEmpty || review.confidence >= 0.85)) {
      applyValueAtFieldPath(nextValues, review.field_path, incomingValue)
    }

    nextFieldReviews[review.field_path] = {
      ...review,
      reviewed: isProtected ? true : review.reviewed,
      requires_confirmation:
        review.confidence < 0.6 || review.issues.length > 0 || isProtected ? review.requires_confirmation : review.requires_confirmation,
      source_mode: current.source_mode === "manual" ? "hybrid" : "autofill",
    }
  }

  const nextDraft: CaregiverOnboardingDraftState = {
    ...current,
    mode: "autofill",
    source_mode: deriveSourceMode(current.source_mode, audit),
    values: nextValues,
    field_reviews: nextFieldReviews,
    uploads: extraction.document_results,
    validation_issues: extraction.validation_issues,
    last_extracted_at: audit?.extracted_at ?? new Date().toISOString(),
  }

  return revalidateDraft(nextDraft)
}

export function revalidateDraft(current: CaregiverOnboardingDraftState) {
  return {
    ...current,
    validation_issues: validateCaregiverProfileDraft(current.values, current.field_reviews),
  }
}

export function applyValueAtFieldPath(
  values: CaregiverProfileDraft,
  fieldPath: string,
  value: unknown,
) {
  switch (fieldPath) {
    case "full_name":
      values.full_name = toNullableString(value)
      break
    case "date_of_birth":
      values.date_of_birth = toNullableString(value)
      break
    case "nationality":
      values.nationality = toNullableString(value)
      break
    case "id_number":
      values.id_number = toNullableString(value)
      break
    case "phone":
      values.phone = toNullableString(value)
      break
    case "email":
      values.email = toNullableString(value)
      break
    case "address":
      values.address = toNullableString(value)
      break
    case "certifications":
      values.certifications = Array.isArray(value) ? structuredClone(value) : []
      break
    case "medical_clearance.status":
      values.medical_clearance.status = toNullableString(value)
      break
    case "medical_clearance.issue_date":
      values.medical_clearance.issue_date = toNullableString(value)
      break
    case "medical_clearance.expiry_date":
      values.medical_clearance.expiry_date = toNullableString(value)
      break
    case "vaccinations":
      values.vaccinations = Array.isArray(value) ? structuredClone(value) : []
      break
    case "languages":
      values.languages = Array.isArray(value) ? value.filter(isStringValue) : []
      break
    case "years_experience":
      values.years_experience = typeof value === "number" ? value : value === null ? null : Number(value)
      break
    case "emergency_contact.name":
      values.emergency_contact.name = toNullableString(value)
      break
    case "emergency_contact.phone":
      values.emergency_contact.phone = toNullableString(value)
      break
    case "emergency_contact.relationship":
      values.emergency_contact.relationship = toNullableString(value)
      break
    default:
      break
  }
}

function deriveSourceMode(currentSourceMode: SourceMode, audit: ExtractionAuditRecord | null): SourceMode {
  if (!audit) {
    return currentSourceMode
  }

  if (currentSourceMode === "manual") {
    return "hybrid"
  }

  return "autofill"
}

function getDraftValueByPath(values: CaregiverProfileDraft, fieldPath: CaregiverProfileFieldPath) {
  switch (fieldPath) {
    case "full_name":
      return values.full_name
    case "date_of_birth":
      return values.date_of_birth
    case "nationality":
      return values.nationality
    case "id_number":
      return values.id_number
    case "phone":
      return values.phone
    case "email":
      return values.email
    case "address":
      return values.address
    case "certifications":
      return values.certifications
    case "medical_clearance.status":
      return values.medical_clearance.status
    case "medical_clearance.issue_date":
      return values.medical_clearance.issue_date
    case "medical_clearance.expiry_date":
      return values.medical_clearance.expiry_date
    case "vaccinations":
      return values.vaccinations
    case "languages":
      return values.languages
    case "years_experience":
      return values.years_experience
    case "emergency_contact.name":
      return values.emergency_contact.name
    case "emergency_contact.phone":
      return values.emergency_contact.phone
    case "emergency_contact.relationship":
      return values.emergency_contact.relationship
  }
}

function isEmptyDraftValue(value: unknown) {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === "string") {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}

function addUniqueField(current: string[], fieldPath: string) {
  return current.includes(fieldPath) ? current : [...current, fieldPath]
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") {
    return value === null ? null : String(value ?? "").trim() || null
  }

  return value.trim() || null
}

function isStringValue(value: unknown): value is string {
  return typeof value === "string"
}
