export const caregiverProfileFieldPaths = [
  "full_name",
  "date_of_birth",
  "nationality",
  "id_number",
  "phone",
  "email",
  "address",
  "certifications",
  "medical_clearance.status",
  "medical_clearance.issue_date",
  "medical_clearance.expiry_date",
  "vaccinations",
  "languages",
  "years_experience",
  "emergency_contact.name",
  "emergency_contact.phone",
  "emergency_contact.relationship",
] as const

export type CaregiverProfileFieldPath = (typeof caregiverProfileFieldPaths)[number]

export type ConfidenceBand = "high" | "medium" | "low"

export type DocumentKind =
  | "government_id"
  | "caregiver_certificate"
  | "medical_clearance"
  | "vaccination_record"
  | "resume"
  | "unknown"

export type SourceMode = "manual" | "autofill" | "hybrid"

export type DateString = string

export type CaregiverCertification = {
  name: string | null
  number: string | null
  issue_date: DateString | null
  expiry_date: DateString | null
}

export type MedicalClearance = {
  status: string | null
  issue_date: DateString | null
  expiry_date: DateString | null
}

export type VaccinationRecord = {
  name: string | null
  date: DateString | null
}

export type EmergencyContact = {
  name: string | null
  phone: string | null
  relationship: string | null
}

export type CaregiverProfileDraft = {
  full_name: string | null
  date_of_birth: DateString | null
  nationality: string | null
  id_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  certifications: CaregiverCertification[]
  medical_clearance: MedicalClearance
  vaccinations: VaccinationRecord[]
  languages: string[]
  years_experience: number | null
  emergency_contact: EmergencyContact
}

export type ExtractionEvidence = {
  snippet: string
  document_id: string
  page: number | null
}

export type FieldReview = {
  field_path: CaregiverProfileFieldPath
  value: unknown
  confidence: number
  confidence_band: ConfidenceBand
  evidence: ExtractionEvidence[]
  issues: string[]
  requires_confirmation: boolean
  reviewed: boolean
  source_mode: SourceMode
}

export type ExtractionDocumentResult = {
  document_id: string
  file_name: string
  document_kind: DocumentKind
  mime_type: string
  extraction_method: "direct_pdf_text" | "ocr_image" | "ocr_pdf" | "unknown"
  raw_text: string
  raw_text_char_count: number
}

export type ExtractionAuditRecord = {
  extracted_at: string
  model_name: string
  model_version: string | null
  prompt_version: string
  raw_text_by_document: Array<{
    document_id: string
    raw_text: string
  }>
  extracted_json: CaregiverExtractionResult
}

export type CaregiverExtractionResult = {
  caregiver_profile: CaregiverProfileDraft
  field_reviews: FieldReview[]
  document_results: ExtractionDocumentResult[]
  validation_issues: ValidationIssue[]
}

export type ValidationIssueSeverity = "error" | "warning"

export type ValidationIssue = {
  field_path: string
  code:
    | "required"
    | "invalid_format"
    | "invalid_date"
    | "expired"
    | "future_date"
    | "inconsistent_value"
    | "low_confidence"
    | "unconfirmed"
  message: string
  severity: ValidationIssueSeverity
}

export type CaregiverOnboardingDraftState = {
  mode: "manual" | "autofill"
  source_mode: SourceMode
  values: CaregiverProfileDraft
  field_reviews: Record<string, FieldReview>
  user_edited_fields: string[]
  uploads: ExtractionDocumentResult[]
  validation_issues: ValidationIssue[]
  last_extracted_at: string | null
}

export const emptyCaregiverProfileDraft: CaregiverProfileDraft = {
  full_name: null,
  date_of_birth: null,
  nationality: null,
  id_number: null,
  phone: null,
  email: null,
  address: null,
  certifications: [],
  medical_clearance: {
    status: null,
    issue_date: null,
    expiry_date: null,
  },
  vaccinations: [],
  languages: [],
  years_experience: null,
  emergency_contact: {
    name: null,
    phone: null,
    relationship: null,
  },
}

export const caregiverProfileJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://align.local/schemas/caregiver-profile.json",
  title: "CaregiverProfileDraft",
  type: "object",
  additionalProperties: false,
  required: [
    "full_name",
    "date_of_birth",
    "nationality",
    "id_number",
    "phone",
    "email",
    "address",
    "certifications",
    "medical_clearance",
    "vaccinations",
    "languages",
    "years_experience",
    "emergency_contact",
  ],
  properties: {
    full_name: { type: ["string", "null"] },
    date_of_birth: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    nationality: { type: ["string", "null"] },
    id_number: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    email: { type: ["string", "null"], format: "email" },
    address: { type: ["string", "null"] },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "number", "issue_date", "expiry_date"],
        properties: {
          name: { type: ["string", "null"] },
          number: { type: ["string", "null"] },
          issue_date: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          expiry_date: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        },
      },
    },
    medical_clearance: {
      type: "object",
      additionalProperties: false,
      required: ["status", "issue_date", "expiry_date"],
      properties: {
        status: { type: ["string", "null"] },
        issue_date: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        expiry_date: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      },
    },
    vaccinations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "date"],
        properties: {
          name: { type: ["string", "null"] },
          date: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        },
      },
    },
    languages: {
      type: "array",
      items: { type: "string" },
    },
    years_experience: {
      type: ["number", "null"],
      minimum: 0,
      maximum: 80,
    },
    emergency_contact: {
      type: "object",
      additionalProperties: false,
      required: ["name", "phone", "relationship"],
      properties: {
        name: { type: ["string", "null"] },
        phone: { type: ["string", "null"] },
        relationship: { type: ["string", "null"] },
      },
    },
  },
} as const

export const fieldReviewJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "field_path",
    "value",
    "confidence",
    "confidence_band",
    "evidence",
    "issues",
    "requires_confirmation",
    "reviewed",
    "source_mode",
  ],
  properties: {
    field_path: { type: "string", enum: [...caregiverProfileFieldPaths] },
    value: {},
    confidence: { type: "number", minimum: 0, maximum: 1 },
    confidence_band: { type: "string", enum: ["high", "medium", "low"] },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["snippet", "document_id", "page"],
        properties: {
          snippet: { type: "string" },
          document_id: { type: "string" },
          page: { type: ["number", "null"] },
        },
      },
    },
    issues: {
      type: "array",
      items: { type: "string" },
    },
    requires_confirmation: { type: "boolean" },
    reviewed: { type: "boolean" },
    source_mode: { type: "string", enum: ["manual", "autofill", "hybrid"] },
  },
} as const

export const caregiverExtractionResultJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://align.local/schemas/caregiver-extraction-result.json",
  title: "CaregiverExtractionResult",
  type: "object",
  additionalProperties: false,
  required: [
    "caregiver_profile",
    "field_reviews",
    "document_results",
    "validation_issues",
  ],
  properties: {
    caregiver_profile: caregiverProfileJsonSchema,
    field_reviews: {
      type: "array",
      items: fieldReviewJsonSchema,
    },
    document_results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "document_id",
          "file_name",
          "document_kind",
          "mime_type",
          "extraction_method",
          "raw_text",
          "raw_text_char_count",
        ],
        properties: {
          document_id: { type: "string" },
          file_name: { type: "string" },
          document_kind: {
            type: "string",
            enum: [
              "government_id",
              "caregiver_certificate",
              "medical_clearance",
              "vaccination_record",
              "resume",
              "unknown",
            ],
          },
          mime_type: { type: "string" },
          extraction_method: {
            type: "string",
            enum: ["direct_pdf_text", "ocr_image", "ocr_pdf", "unknown"],
          },
          raw_text: { type: "string" },
          raw_text_char_count: { type: "number", minimum: 0 },
        },
      },
    },
    validation_issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field_path", "code", "message", "severity"],
        properties: {
          field_path: { type: "string" },
          code: {
            type: "string",
            enum: [
              "required",
              "invalid_format",
              "invalid_date",
              "expired",
              "future_date",
              "inconsistent_value",
              "low_confidence",
              "unconfirmed",
            ],
          },
          message: { type: "string" },
          severity: { type: "string", enum: ["error", "warning"] },
        },
      },
    },
  },
} as const
