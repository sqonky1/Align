import type { CareProfileFormValues } from "../../types"
import {
  filterAllowedCareProfileValues,
  type CareProfileArrayFieldName,
} from "../../lib/careProfiles"
import type { CareProfileExtractionResponse } from "./api"

const HIGH_CONFIDENCE_THRESHOLD = 0.85

export function mergeCareProfileExtraction(
  currentValues: CareProfileFormValues,
  extraction: CareProfileExtractionResponse,
  userEditedFields: Set<keyof CareProfileFormValues>,
) {
  const nextValues: CareProfileFormValues = structuredClone(currentValues)

  mergeStringField(nextValues, "name", extraction, userEditedFields)
  mergeStringField(nextValues, "age", extraction, userEditedFields)
  mergeGenderField(nextValues, extraction, userEditedFields)
  mergeStringField(nextValues, "preferredLanguage", extraction, userEditedFields)
  mergeArrayField(nextValues, "preferredLanguages", extraction, userEditedFields)
  mergeArrayField(nextValues, "conditions", extraction, userEditedFields)
  mergeArrayField(nextValues, "dailyCareTasks", extraction, userEditedFields)
  mergeArrayField(nextValues, "mobilitySupport", extraction, userEditedFields)
  mergeArrayField(nextValues, "medicationSupport", extraction, userEditedFields)
  mergeArrayField(nextValues, "householdContext", extraction, userEditedFields)
  mergeStringField(nextValues, "riskNotes", extraction, userEditedFields)
  mergeStringField(nextValues, "additionalNotes", extraction, userEditedFields)

  if (!nextValues.preferredLanguage && nextValues.preferredLanguages.length > 0) {
    nextValues.preferredLanguage = nextValues.preferredLanguages[0]
  }

  return nextValues
}

function mergeStringField(
  nextValues: CareProfileFormValues,
  field: keyof Pick<
    CareProfileFormValues,
    "name" | "age" | "preferredLanguage" | "riskNotes" | "additionalNotes"
  >,
  extraction: CareProfileExtractionResponse,
  userEditedFields: Set<keyof CareProfileFormValues>,
) {
  if (userEditedFields.has(field)) {
    return
  }

  const incomingValue = extraction.values[field]

  if (nextValues[field].trim().length === 0) {
    nextValues[field] = incomingValue
    return
  }

  const review = extraction.fieldReviews.find((entry) => entry.field === field)

  if (review && review.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    nextValues[field] = incomingValue
  }
}

function mergeGenderField(
  nextValues: CareProfileFormValues,
  extraction: CareProfileExtractionResponse,
  userEditedFields: Set<keyof CareProfileFormValues>,
) {
  const field = "gender"

  if (userEditedFields.has(field)) {
    return
  }

  const incomingValue = extraction.values.gender

  if (incomingValue !== "male" && incomingValue !== "female" && incomingValue !== "") {
    return
  }

  if (nextValues.gender === "") {
    nextValues.gender = incomingValue
    return
  }

  const review = extraction.fieldReviews.find((entry) => entry.field === field)

  if (review && review.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    nextValues.gender = incomingValue
  }
}

function mergeArrayField(
  nextValues: CareProfileFormValues,
  field: keyof Pick<
    CareProfileFormValues,
    | "preferredLanguages"
    | "conditions"
    | "dailyCareTasks"
    | "mobilitySupport"
    | "medicationSupport"
    | "householdContext"
  > &
    CareProfileArrayFieldName,
  extraction: CareProfileExtractionResponse,
  userEditedFields: Set<keyof CareProfileFormValues>,
) {
  if (userEditedFields.has(field)) {
    return
  }

  const review = extraction.fieldReviews.find((entry) => entry.field === field)
  const highConfidenceSuggestions = filterAllowedCareProfileValues(
    field,
    review?.suggestedValues
      .filter((entry) => entry.confidence >= HIGH_CONFIDENCE_THRESHOLD)
      .map((entry) => entry.value) ?? [],
  )

  if (highConfidenceSuggestions.length > 0) {
    nextValues[field] = dedupeTextValues([...nextValues[field], ...highConfidenceSuggestions])
    return
  }

  if (nextValues[field].length === 0) {
    nextValues[field] = filterAllowedCareProfileValues(field, extraction.values[field])
    return
  }

  if (review && review.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    nextValues[field] = filterAllowedCareProfileValues(field, extraction.values[field])
  }
}

function dedupeTextValues(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index)
}
