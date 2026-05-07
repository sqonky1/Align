export type CareProfileStatus = "draft" | "ready_for_search"

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
  status: CareProfileStatus
  createdAt: string
  updatedAt: string
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

export type SearchPreviewResult = {
  careProfileId: string
  caregiverId: string
  matchPercent: number
  summary: string
  traits: string[]
}

export type SearchCaregiverCard = {
  id: string
  name: string
  agency: string
  summary: string
  traits: string[]
  matchPercent: number | null
}
