import { agencies } from "../data/agencies"
import { caregivers } from "../data/caregivers"
import { careProfiles } from "../data/careProfiles"
import { savedCaregivers } from "../data/savedCaregivers"
import { getCaregiverLanguageDisplay, getRankedCaregiverMatches } from "./matching"
import type {
  CareProfileWorkspaceCard,
  Caregiver,
  CareProfile,
  SearchCaregiverBreakdownItem,
  SearchCaregiverCard,
  WorkspaceSavedCaregiverCard,
} from "../types"

const CARE_PROFILES_STORAGE_KEY = "align.careProfiles"

export function getAgencies() {
  return agencies
}

export function getCareProfiles() {
  return readStoredCareProfiles() ?? careProfiles
}

export function getCareProfileById(profileId: string) {
  return getCareProfiles().find((profile) => profile.id === profileId) ?? null
}

export function saveCareProfile(profile: CareProfile) {
  const nextProfiles = [...getCareProfiles()]
  const existingIndex = nextProfiles.findIndex((entry) => entry.id === profile.id)

  if (existingIndex >= 0) {
    nextProfiles[existingIndex] = profile
  } else {
    nextProfiles.unshift(profile)
  }

  writeStoredCareProfiles(nextProfiles)

  return profile
}

export function deleteCareProfile(profileId: string) {
  const nextProfiles = getCareProfiles().filter((profile) => profile.id !== profileId)
  writeStoredCareProfiles(nextProfiles)
}

export function getCaregivers() {
  return caregivers
}

export function getCaregiverById(caregiverId: string) {
  return caregivers.find((caregiver) => caregiver.id === caregiverId) ?? null
}

export function getSavedCaregiverLinks() {
  return savedCaregivers
}

export function getCareProfileCardData(): CareProfileWorkspaceCard[] {
  const profiles = getCareProfiles()

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    age: profile.age,
    gender: profile.gender,
    preferredLanguage: profile.preferredLanguage,
  }))
}

export function getSavedCaregiverGalleryData(): WorkspaceSavedCaregiverCard[] {
  const profiles = getCareProfiles()

  return savedCaregivers.flatMap((saved) => {
    const caregiver = caregivers.find((entry) => entry.id === saved.caregiverId)
    const profile = profiles.find((entry) => entry.id === saved.careProfileId)

    if (!caregiver || !profile) {
      return []
    }

    return [
      {
        id: saved.id,
        caregiverId: caregiver.id,
        careProfileId: profile.id,
        name: caregiver.name,
        agency: caregiver.agencyName,
        summary: caregiver.bio,
        note: `Saved for ${profile.name}`,
        traits: [
          formatLabel(caregiver.careConditions[0] ?? "general support"),
          caregiver.languages[0] ?? "Language not set",
          `${caregiver.yearsOfExperience} years`,
        ],
      },
    ]
  })
}

export function getRankedCaregiverGalleryData(profile: CareProfile): SearchCaregiverCard[] {
  return getRankedCaregiverMatches(profile, caregivers).map((result) => ({
    id: result.caregiver.id,
    name: result.caregiver.name,
    agency: result.caregiver.agencyName,
    matchPercent: result.matchPercent,
    summary: result.summary,
    traits: result.traits,
    alert: result.alert,
    breakdown: result.breakdown
      .filter((item) => item.maxScore > 0)
      .map((item) => toSearchBreakdownItem(item, result.caregiver, profile.preferredLanguage)),
  }))
}

export function getBrowseCaregiverGalleryData(): SearchCaregiverCard[] {
  return caregivers.map((caregiver) => ({
    id: caregiver.id,
    name: caregiver.name,
    agency: caregiver.agencyName,
    matchPercent: null,
    summary: caregiver.bio,
    traits: [
      { label: getCaregiverLanguageDisplay(caregiver) },
      { label: formatLabel(caregiver.careConditions[0] ?? "general support") },
      { label: `${caregiver.yearsOfExperience} years` },
    ],
    alert: null,
    breakdown: [],
  }))
}

export function formatDisplayLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

const formatLabel = formatDisplayLabel

function toSearchBreakdownItem(item: {
  key: string
  label: string
  score: number
  maxScore: number
  matchedValues: string[]
  missingValues: string[]
}, caregiver: Caregiver, preferredLanguage: string): SearchCaregiverBreakdownItem {
  const scorePercent = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0

  if (item.key === "language") {
    return {
      key: item.key,
      label: item.label,
      scorePercent,
      summary: getCaregiverLanguageDisplay(caregiver, preferredLanguage),
    }
  }

  if (item.key === "experience") {
    return {
      key: item.key,
      label: item.label,
      scorePercent,
      summary: item.matchedValues[0] ?? "Experience not available",
    }
  }

  const requestedCount = item.matchedValues.length + item.missingValues.length

  return {
    key: item.key,
    label: item.label,
    scorePercent,
    summary: `${item.matchedValues.length}/${requestedCount}`,
  }
}

function readStoredCareProfiles() {
  if (typeof window === "undefined") {
    return null
  }

  const rawValue = window.localStorage.getItem(CARE_PROFILES_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? (parsedValue as CareProfile[]) : null
  } catch {
    return null
  }
}

function writeStoredCareProfiles(profiles: CareProfile[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(CARE_PROFILES_STORAGE_KEY, JSON.stringify(profiles))
}
