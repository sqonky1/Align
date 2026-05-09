import {
  caregiverExtractionResultJsonSchema,
  caregiverProfileFieldPaths,
} from "./types"

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
  "For years_experience, return a number only when the source supports a specific numeric value or a directly computable whole-number total.",
  "For languages, return distinct strings only when explicitly stated.",
  "For certifications and vaccinations, include one object per item found in the documents.",
  "For medical_clearance.status, prefer short values such as cleared, fit, passed, not_cleared, pending when directly supported; otherwise copy the explicit status text conservatively.",
  "For field_reviews, provide one entry for every field path in the target list.",
  "confidence must be a number from 0 to 1.",
  "confidence_band must follow this policy: high for confidence >= 0.85, medium for 0.60 to 0.84, low for < 0.60.",
  "requires_confirmation must be true for low confidence fields and for fields with any validation or ambiguity issue.",
  "Evidence snippets must be short excerpts from the provided text and must not invent words.",
  "If multiple documents disagree, choose null unless one source is clearly more authoritative and recent; record the conflict in issues.",
  "The output must satisfy the provided JSON schema.",
].join(" ")

export function buildCaregiverExtractionUserPrompt(input: {
  documents: Array<{
    document_id: string
    file_name: string
    document_kind: string
    mime_type: string
    raw_text: string
  }>
}) {
  return JSON.stringify(
    {
      task: "Extract caregiver onboarding data into the target schema.",
      prompt_version: CAREGIVER_EXTRACTION_PROMPT_VERSION,
      target_field_paths: caregiverProfileFieldPaths,
      response_schema: caregiverExtractionResultJsonSchema,
      documents: input.documents,
      instructions: {
        caregiver_profile: {
          full_name: "Legal or primary full name when explicitly stated.",
          date_of_birth: "Birth date in YYYY-MM-DD.",
          nationality: "Nationality or citizenship when explicit.",
          id_number: "Government-issued ID/passport/permit number when explicit.",
          phone: "Primary phone number if present.",
          email: "Primary email address if present.",
          address: "Mailing or residential address if present.",
          certifications: [
            {
              name: "Certification or license name.",
              number: "Certificate or license number.",
              issue_date: "Issue date in YYYY-MM-DD.",
              expiry_date: "Expiry date in YYYY-MM-DD.",
            },
          ],
          medical_clearance: {
            status: "Medical clearance result or status.",
            issue_date: "Medical clearance issue date in YYYY-MM-DD.",
            expiry_date: "Medical clearance expiry date in YYYY-MM-DD.",
          },
          vaccinations: [
            {
              name: "Vaccination name.",
              date: "Vaccination date in YYYY-MM-DD.",
            },
          ],
          languages: ["Explicitly stated spoken languages only."],
          years_experience: "Numeric years of caregiving or related experience.",
          emergency_contact: {
            name: "Emergency contact full name.",
            phone: "Emergency contact phone number.",
            relationship: "Emergency contact relationship to caregiver.",
          },
        },
        field_reviews: {
          required_rule: "Return one review record for every field path in target_field_paths.",
          field_path_values: caregiverProfileFieldPaths,
          evidence_rule:
            "Each review must include at least one evidence object when the field value is non-null or non-empty. Use an empty evidence array only when the value is unknown.",
          issues_rule:
            "Use issues to note ambiguity, conflicts, unreadable OCR, invalid date patterns, or inferred values that were rejected.",
        },
      },
    },
    null,
    2,
  )
}
