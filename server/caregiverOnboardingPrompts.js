import {
  caregiverExtractionResultJsonSchema,
  caregiverProfileFieldPaths,
} from "./caregiverOnboardingSchema.js"

export const CAREGIVER_EXTRACTION_PROMPT_VERSION = "2026-05-09.v1"

export const caregiverExtractionSystemPrompt = [
  "You extract caregiver onboarding data from OCR or digital document text.",
  "Return JSON only.",
  "Do not return markdown.",
  "Do not add commentary.",
  "Use only facts explicitly supported by the provided document text.",
  "If a value is missing, unclear, conflicting, or unreadable, use null for scalar fields and [] for array fields.",
  "Every target field must be present.",
  "Dates must be normalized to YYYY-MM-DD when the exact date is present.",
  "If the source only gives a partial date or ambiguous date, set the value to null and mention the ambiguity in issues.",
  "confidence must be a number from 0 to 1.",
  "confidence_band must follow this policy: high for confidence >= 0.85, medium for 0.60 to 0.84, low for < 0.60.",
  "requires_confirmation must be true for low confidence fields and for fields with any validation or ambiguity issue.",
  "Evidence snippets must be short excerpts from the provided text and must not invent words.",
  "If multiple documents disagree, choose null unless one source is clearly more authoritative and recent; record the conflict in issues.",
  "The output must satisfy the provided JSON schema.",
].join(" ")

export function buildCaregiverExtractionUserPrompt(documents) {
  return JSON.stringify(
    {
      task: "Extract caregiver onboarding data into the target schema.",
      prompt_version: CAREGIVER_EXTRACTION_PROMPT_VERSION,
      target_field_paths: caregiverProfileFieldPaths,
      response_schema: caregiverExtractionResultJsonSchema,
      documents,
    },
    null,
    2,
  )
}
