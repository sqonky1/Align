import type { CareProfile, CareProfileFormValues } from "../types"

export type CareProfileOption = {
  value: string
  label: string
}

export const languageOptions: CareProfileOption[] = [
  { value: "English", label: "English" },
  { value: "Mandarin", label: "Mandarin" },
  { value: "Tamil", label: "Tamil" },
  { value: "Malay", label: "Malay" },
  { value: "Cantonese", label: "Cantonese" },
  { value: "Hokkien", label: "Hokkien" },
]

export const conditionOptions: CareProfileOption[] = [
  { value: "dementia", label: "Dementia" },
  { value: "stroke", label: "Stroke" },
  { value: "diabetes", label: "Diabetes" },
  { value: "parkinsons", label: "Parkinson's" },
  { value: "hypertension", label: "Hypertension" },
  { value: "arthritis", label: "Arthritis" },
]

export const dailyCareTaskOptions: CareProfileOption[] = [
  { value: "bathing", label: "Bathing" },
  { value: "feeding", label: "Feeding" },
  { value: "toileting", label: "Toileting" },
  { value: "meal_preparation", label: "Meal preparation" },
  { value: "companionship", label: "Companionship" },
  { value: "exercise_support", label: "Exercise support" },
]

export const mobilitySupportOptions: CareProfileOption[] = [
  { value: "walking_assistance", label: "Walking assistance" },
  { value: "wheelchair_support", label: "Wheelchair support" },
  { value: "transfer_support", label: "Transfer support" },
  { value: "fall_risk_monitoring", label: "Fall-risk monitoring" },
  { value: "bedbound_support", label: "Bedbound support" },
]

export const medicationSupportOptions: CareProfileOption[] = [
  { value: "medication_reminders", label: "Medication reminders" },
  { value: "blood_pressure_monitoring", label: "Blood pressure monitoring" },
  { value: "blood_glucose_monitoring", label: "Blood glucose monitoring" },
]

export const householdContextOptions: CareProfileOption[] = [
  { value: "lives_alone", label: "Lives alone" },
  { value: "lives_with_spouse", label: "Lives with spouse" },
  { value: "night_supervision_needed", label: "Night supervision needed" },
  { value: "stairs_at_home", label: "Stairs at home" },
]

export function getEmptyCareProfileFormValues(): CareProfileFormValues {
  return {
    name: "",
    age: "",
    gender: "",
    preferredLanguage: "",
    preferredLanguages: [],
    conditions: [],
    dailyCareTasks: [],
    mobilitySupport: [],
    medicationSupport: [],
    householdContext: [],
    riskNotes: "",
    additionalNotes: "",
  }
}

export function toCareProfileFormValues(profile: CareProfile): CareProfileFormValues {
  const preferredLanguages =
    profile.preferredLanguages.length > 0
      ? profile.preferredLanguages
      : profile.preferredLanguage
        ? [profile.preferredLanguage]
        : []

  return {
    name: profile.name,
    age: String(profile.age),
    gender: profile.gender,
    preferredLanguage: profile.preferredLanguage,
    preferredLanguages,
    conditions: profile.conditions,
    dailyCareTasks: profile.dailyCareTasks,
    mobilitySupport: profile.mobilitySupport,
    medicationSupport: profile.medicationSupport,
    householdContext: profile.householdContext,
    riskNotes: profile.riskNotes,
    additionalNotes: profile.additionalNotes,
  }
}

export function buildCareProfileFromForm(
  values: CareProfileFormValues,
  existingProfile?: CareProfile | null,
): CareProfile {
  const timestamp = new Date().toISOString()
  const normalizedPreferredLanguages = values.preferredLanguages
    .map((value) => value.trim())
    .filter(Boolean)
  const primaryPreferredLanguage =
    values.preferredLanguage.trim() || normalizedPreferredLanguages[0] || ""

  return {
    id: existingProfile?.id ?? createProfileId(),
    name: values.name.trim(),
    age: Number(values.age) || 0,
    gender: values.gender || "female",
    preferredLanguage: primaryPreferredLanguage,
    preferredLanguages: normalizedPreferredLanguages,
    conditions: normalizeTextArray(values.conditions),
    dailyCareTasks: normalizeTextArray(values.dailyCareTasks),
    mobilitySupport: normalizeTextArray(values.mobilitySupport),
    medicationSupport: normalizeTextArray(values.medicationSupport),
    householdContext: normalizeTextArray(values.householdContext),
    riskNotes: values.riskNotes.trim(),
    additionalNotes: values.additionalNotes.trim(),
    createdAt: existingProfile?.createdAt ?? timestamp,
    updatedAt: timestamp,
  }
}

function normalizeTextArray(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function createProfileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `profile-${Date.now()}`
}
