import { agencies } from "../data/agencies"
import { caregivers } from "../data/caregivers"
import { careProfiles } from "../data/careProfiles"
import { savedCaregivers, searchPreviewResults } from "../data/savedCaregivers"
import type { CareProfileStatus, SearchCaregiverCard } from "../types"

export function getAgencies() {
  return agencies
}

export function getCareProfiles() {
  return careProfiles
}

export function getCareProfileById(profileId: string) {
  return careProfiles.find((profile) => profile.id === profileId) ?? null
}

export function getCaregivers() {
  return caregivers
}

export function getSavedCaregiverLinks() {
  return savedCaregivers
}

export function getCareProfileCardData() {
  return careProfiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    summary: `${profile.age} years old`,
    details: [
      ...profile.conditions.slice(0, 2).map(formatLabel),
      profile.preferredLanguage,
    ],
    status: formatStatus(profile.status),
  }))
}

export function getSavedCaregiverGalleryData() {
  return savedCaregivers.flatMap((saved) => {
    const caregiver = caregivers.find((entry) => entry.id === saved.caregiverId)
    const profile = careProfiles.find((entry) => entry.id === saved.careProfileId)

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

export function getSearchPreviewData(): SearchCaregiverCard[] {
  return searchPreviewResults.flatMap((result) => {
    const caregiver = caregivers.find((entry) => entry.id === result.caregiverId)

    if (!caregiver) {
      return []
    }

    return [
      {
        id: caregiver.id,
        name: caregiver.name,
        agency: caregiver.agencyName,
        matchPercent: result.matchPercent,
        summary: result.summary,
        traits: result.traits,
      },
    ]
  })
}

export function getBrowseCaregiverGalleryData(): SearchCaregiverCard[] {
  return caregivers.slice(0, 4).map((caregiver) => ({
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
  }))
}

export function formatDisplayLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

function formatStatus(status: CareProfileStatus) {
  return status === "ready_for_search" ? "Ready for search" : "Draft profile"
}

const formatLabel = formatDisplayLabel
