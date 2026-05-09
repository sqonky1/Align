import type {
  CaregiverOnboardingDraftState,
  CaregiverProfileDraft,
  CaregiverProfileFieldPath,
  ConfidenceBand,
  FieldReview,
  ValidationIssue,
} from "./types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const REQUIRED_FIELD_PATHS: string[] = [
  "full_name",
  "date_of_birth",
  "nationality",
  "id_number",
  "phone",
  "address",
  "languages",
  "years_experience",
  "emergency_contact.name",
  "emergency_contact.phone",
  "emergency_contact.relationship",
]

export function validateCaregiverProfileDraft(
  values: CaregiverProfileDraft,
  fieldReviews: Record<string, FieldReview> = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const fieldPath of REQUIRED_FIELD_PATHS) {
    const value = getValueAtFieldPath(values, fieldPath)

    if (isMissingValue(value)) {
      issues.push({
        field_path: fieldPath,
        code: "required",
        message: "This field is required before submit.",
        severity: "error",
      })
    }
  }

  validateDateField(values.date_of_birth, "date_of_birth", issues, { allowFuture: false })
  validateDateField(values.medical_clearance.issue_date, "medical_clearance.issue_date", issues)
  validateDateField(values.medical_clearance.expiry_date, "medical_clearance.expiry_date", issues)

  for (const [index, certification] of values.certifications.entries()) {
    validateDateField(certification.issue_date, `certifications[${index}].issue_date`, issues)
    validateDateField(certification.expiry_date, `certifications[${index}].expiry_date`, issues)
    validateExpirySanity(
      certification.issue_date,
      certification.expiry_date,
      `certifications[${index}].expiry_date`,
      issues,
    )
  }

  for (const [index, vaccination] of values.vaccinations.entries()) {
    validateDateField(vaccination.date, `vaccinations[${index}].date`, issues, {
      allowFuture: false,
    })
  }

  validateExpirySanity(
    values.medical_clearance.issue_date,
    values.medical_clearance.expiry_date,
    "medical_clearance.expiry_date",
    issues,
  )

  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    issues.push({
      field_path: "email",
      code: "invalid_format",
      message: "Enter a valid email address.",
      severity: "error",
    })
  }

  if (values.years_experience !== null && (!Number.isFinite(values.years_experience) || values.years_experience < 0)) {
    issues.push({
      field_path: "years_experience",
      code: "invalid_format",
      message: "Years of experience must be zero or greater.",
      severity: "error",
    })
  }

  for (const review of Object.values(fieldReviews)) {
    if (review.requires_confirmation) {
      issues.push({
        field_path: review.field_path,
        code: review.confidence_band === "low" ? "low_confidence" : "unconfirmed",
        message:
          review.confidence_band === "low"
            ? "Low-confidence field requires review."
            : "This extracted field still requires confirmation.",
        severity: review.confidence_band === "low" ? "error" : "warning",
      })
    }

    for (const issue of review.issues) {
      issues.push({
        field_path: review.field_path,
        code: "inconsistent_value",
        message: issue,
        severity: "warning",
      })
    }
  }

  return dedupeValidationIssues(issues)
}

export function classifyConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.85) {
    return "high"
  }

  if (confidence >= 0.6) {
    return "medium"
  }

  return "low"
}

export function getFieldStatusClass(
  draft: CaregiverOnboardingDraftState,
  fieldPath: CaregiverProfileFieldPath,
) {
  const review = draft.field_reviews[fieldPath]
  const hasError = draft.validation_issues.some(
    (issue) => issue.field_path === fieldPath && issue.severity === "error",
  )

  if (hasError) {
    return "field-status-invalid"
  }

  if (!review) {
    return "field-status-default"
  }

  if (review.confidence_band === "medium") {
    return "field-status-medium"
  }

  if (review.confidence_band === "low") {
    return "field-status-low"
  }

  if (review.reviewed) {
    return "field-status-reviewed"
  }

  return "field-status-default"
}

export function isDraftSubmittable(draft: CaregiverOnboardingDraftState) {
  return !draft.validation_issues.some((issue) => issue.severity === "error")
}

export function getValueAtFieldPath(values: CaregiverProfileDraft, fieldPath: string): unknown {
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
    default:
      return null
  }
}

function validateDateField(
  value: string | null,
  fieldPath: string,
  issues: ValidationIssue[],
  options: { allowFuture?: boolean } = {},
) {
  if (!value) {
    return
  }

  if (!DATE_PATTERN.test(value)) {
    issues.push({
      field_path: fieldPath,
      code: "invalid_date",
      message: "Date must use YYYY-MM-DD.",
      severity: "error",
    })
    return
  }

  const parsed = Date.parse(value)

  if (Number.isNaN(parsed)) {
    issues.push({
      field_path: fieldPath,
      code: "invalid_date",
      message: "Date is not valid.",
      severity: "error",
    })
    return
  }

  if (options.allowFuture === false && parsed > Date.now()) {
    issues.push({
      field_path: fieldPath,
      code: "future_date",
      message: "Future dates are not allowed here.",
      severity: "error",
    })
  }
}

function validateExpirySanity(
  issueDate: string | null,
  expiryDate: string | null,
  fieldPath: string,
  issues: ValidationIssue[],
) {
  if (!issueDate || !expiryDate || !DATE_PATTERN.test(issueDate) || !DATE_PATTERN.test(expiryDate)) {
    return
  }

  const issueTimestamp = Date.parse(issueDate)
  const expiryTimestamp = Date.parse(expiryDate)

  if (Number.isNaN(issueTimestamp) || Number.isNaN(expiryTimestamp)) {
    return
  }

  if (expiryTimestamp < issueTimestamp) {
    issues.push({
      field_path: fieldPath,
      code: "invalid_date",
      message: "Expiry date cannot be earlier than issue date.",
      severity: "error",
    })
  }

  if (expiryTimestamp < Date.now()) {
    issues.push({
      field_path: fieldPath,
      code: "expired",
      message: "This document appears to be expired.",
      severity: "warning",
    })
  }
}

function isMissingValue(value: unknown) {
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

function dedupeValidationIssues(issues: ValidationIssue[]) {
  const seen = new Set<string>()

  return issues.filter((issue) => {
    const key = `${issue.field_path}:${issue.code}:${issue.message}:${issue.severity}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}
