import { agencies } from "../data/agencies"
import { caregivers } from "../data/caregivers"
import { careProfiles } from "../data/careProfiles"
import { savedCaregivers } from "../data/savedCaregivers"
import { getRankedCaregiverMatches } from "./matching"
import type { CareProfile, SearchCaregiverCard } from "../types"

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

export function getCaregivers() {
  return caregivers
}

export function getSavedCaregiverLinks() {
  return savedCaregivers
}

export function getCareProfileCardData() {
  const profiles = getCareProfiles()

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    summary: `${profile.age} years old`,
    details: [
      ...profile.conditions.slice(0, 2).map(formatLabel),
      profile.preferredLanguage,
    ],
    readinessLabel: isCareProfileSearchReady(profile) ? "Search ready" : "Needs details",
  }))
}

export function getSavedCaregiverGalleryData() {
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
        name: caregiver.name,
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
      caregiver.languages[0] ?? "Language not set",
      formatLabel(caregiver.careConditions[0] ?? "general support"),
      `${caregiver.yearsOfExperience} years`,
    ],
    alert: null,
  }))
}

export function formatDisplayLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

export function isCareProfileSearchReady(profile: CareProfile) {
  return (
    profile.name.trim().length > 0 &&
    profile.age > 0 &&
    profile.preferredLanguage.trim().length > 0 &&
    profile.conditions.length > 0 &&
    profile.dailyCareTasks.length > 0
  )
}

const formatLabel = formatDisplayLabel

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
