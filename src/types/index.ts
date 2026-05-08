export type Agency = {
  id: string
  name: string
  location: string
}

export type CareProfile = {
  id: string
  name: string
  age: number
  gender: "male" | "female"
  preferredLanguage: string
  conditions: string[]
  dailyCareTasks: string[]
  mobilitySupport: string[]
  medicationSupport: string[]
  householdContext: string[]
  riskNotes: string
  additionalNotes: string
  createdAt: string
  updatedAt: string
}

export type CareProfileFormValues = {
  name: string
  age: string
  gender: "" | "male" | "female"
  preferredLanguage: string
  conditions: string[]
  dailyCareTasks: string[]
  mobilitySupport: string[]
  medicationSupport: string[]
  householdContext: string[]
  riskNotes: string
  additionalNotes: string
}

export type Caregiver = {
  id: string
  name: string
  age: number
  gender: "male" | "female"
  agencyId: string
  agencyName: string
  nationality: string
  languages: string[]
  yearsOfExperience: number
  bio: string
  careConditions: string[]
  careTasks: string[]
  mobilitySkills: string[]
  medicationSkills: string[]
  training: string[]
  certifications: string[]
  portraitUrl: string | null
  availability: "available" | "shortlist_only"
}

export type SavedCaregiver = {
  id: string
  careProfileId: string
  caregiverId: string
  savedAt: string
}

export type AgencyHandoffRequest = {
  id: string
  careProfileId: string
  agencyId: string
  caregiverIds: string[]
  note: string
  submittedAt: string
}

export type SearchCaregiverBreakdownItem = {
  key: string
  label: string
  scorePercent: number
  summary: string
}

export type SearchCaregiverPillTone = "strong" | "partial" | "gap"

export type SearchCaregiverPill = {
  label: string
  tone?: SearchCaregiverPillTone
}

export type SearchCaregiverCard = {
  id: string
  name: string
  agency: string
  summary: string
  traits: SearchCaregiverPill[]
  matchPercent: number | null
  alert: string | null
  breakdown: SearchCaregiverBreakdownItem[]
}

export type WorkspaceSavedCaregiverCard = {
  id: string
  caregiverId: string
  careProfileId: string
  name: string
  agency: string
  summary: string
  note: string
  traits: string[]
}

export type CareProfileWorkspaceCard = {
  id: string
  name: string
  age: number
  gender: "male" | "female"
  preferredLanguage: string
}
