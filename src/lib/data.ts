import { agencies } from "../data/agencies"
import { caregivers } from "../data/caregivers"
import { careProfiles } from "../data/careProfiles"
import { savedCaregivers } from "../data/savedCaregivers"
import { getCaregiverLanguageDisplay, getRankedCaregiverMatches } from "./matching"
import type {
  AgencyHandoffRequest,
  CareProfileWorkspaceCard,
  Caregiver,
  CareProfile,
  SearchCaregiverBreakdownItem,
  SearchCaregiverCard,
  SavedCaregiver,
  WorkspaceSavedCaregiverCard,
} from "../types"

const CARE_PROFILES_STORAGE_KEY = "align.careProfiles"
const SAVED_CAREGIVERS_STORAGE_KEY = "align.savedCaregivers"
const AGENCY_HANDOFFS_STORAGE_KEY = "align.agencyHandoffs"

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
  return readStoredSavedCaregivers() ?? savedCaregivers
}

export function isCaregiverSavedForProfile(careProfileId: string, caregiverId: string) {
  return getSavedCaregiverLinks().some(
    (saved) => saved.careProfileId === careProfileId && saved.caregiverId === caregiverId,
  )
}

export function saveCaregiverForProfile(careProfileId: string, caregiverId: string) {
  const existingSaved = getSavedCaregiverLinks()
  const duplicateEntry = existingSaved.find(
    (entry) => entry.careProfileId === careProfileId && entry.caregiverId === caregiverId,
  )

  if (duplicateEntry) {
    return duplicateEntry
  }

  const newEntry: SavedCaregiver = {
    id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    careProfileId,
    caregiverId,
    savedAt: new Date().toISOString(),
  }

  writeStoredSavedCaregivers([newEntry, ...existingSaved])

  return newEntry
}

export function removeSavedCaregiverForProfile(careProfileId: string, caregiverId: string) {
  const filteredEntries = getSavedCaregiverLinks().filter(
    (entry) => !(entry.careProfileId === careProfileId && entry.caregiverId === caregiverId),
  )

  writeStoredSavedCaregivers(filteredEntries)
}

export function getAgencyHandoffRequests() {
  return readStoredAgencyHandoffRequests() ?? []
}

export function getLatestAgencyHandoffForProfile(careProfileId: string) {
  return (
    getAgencyHandoffRequests()
      .filter((entry) => entry.careProfileId === careProfileId)
      .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt))[0] ??
    null
  )
}

export function createAgencyHandoffRequest(input: {
  careProfileId: string
  agencyId: string
  caregiverIds: string[]
  note: string
}) {
  const nextEntry: AgencyHandoffRequest = {
    id: `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    careProfileId: input.careProfileId,
    agencyId: input.agencyId,
    caregiverIds: input.caregiverIds,
    note: input.note.trim(),
    submittedAt: new Date().toISOString(),
  }

  const existingEntries = getAgencyHandoffRequests()
  writeStoredAgencyHandoffRequests([nextEntry, ...existingEntries])

  return nextEntry
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

  return getSavedCaregiverLinks().flatMap((saved) => {
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

export function getSavedCaregiverGalleryDataForProfile(
  careProfileId: string,
): WorkspaceSavedCaregiverCard[] {
  return getSavedCaregiverGalleryData().filter(
    (savedCaregiver) => savedCaregiver.careProfileId === careProfileId,
  )
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

function readStoredSavedCaregivers() {
  if (typeof window === "undefined") {
    return null
  }

  const rawValue = window.localStorage.getItem(SAVED_CAREGIVERS_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? (parsedValue as SavedCaregiver[]) : null
  } catch {
    return null
  }
}

function writeStoredSavedCaregivers(savedLinks: SavedCaregiver[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SAVED_CAREGIVERS_STORAGE_KEY, JSON.stringify(savedLinks))
}

function readStoredAgencyHandoffRequests() {
  if (typeof window === "undefined") {
    return null
  }

  const rawValue = window.localStorage.getItem(AGENCY_HANDOFFS_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue) ? (parsedValue as AgencyHandoffRequest[]) : null
  } catch {
    return null
  }
}

function writeStoredAgencyHandoffRequests(requests: AgencyHandoffRequest[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(AGENCY_HANDOFFS_STORAGE_KEY, JSON.stringify(requests))
}
