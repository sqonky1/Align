import { agencies } from "../data/agencies"
import { caregivers } from "../data/caregivers"
import { careProfiles } from "../data/careProfiles"
import { savedCaregivers } from "../data/savedCaregivers"
import { getCaregiverLanguageDisplay, getRankedCaregiverMatches } from "./matching"
import { buildCaregiverSnapshotPills } from "./caregiverPills"
import { hasSupabaseConfig, selectRows, upsertRows, deleteRows } from "./supabaseRest"
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

type CareProfileRow = {
  id: string
  name: string
  age: number
  gender: "male" | "female"
  preferred_language: string
  preferred_languages: string[]
  conditions: string[]
  daily_care_tasks: string[]
  mobility_support: string[]
  medication_support: string[]
  household_context: string[]
  risk_notes: string
  additional_notes: string
  created_at: string
  updated_at: string
}

type SavedCaregiverRow = {
  id: string
  care_profile_id: string
  caregiver_id: string
  saved_at: string
}

type AgencyHandoffRow = {
  id: string
  care_profile_id: string
  agency_id: string
  caregiver_ids: string[]
  note: string
  submitted_at: string
}

let careProfilesStore = careProfiles.map(normalizeCareProfile)
let savedCaregiversStore = [...savedCaregivers]
let agencyHandoffRequestsStore: AgencyHandoffRequest[] = []
let workspaceInitialized = false
let workspaceInitializationPromise: Promise<void> | null = null

export function getAgencies() {
  return agencies
}

export function getCareProfiles() {
  return careProfilesStore
}

export function getCareProfileById(profileId: string) {
  return getCareProfiles().find((profile) => profile.id === profileId) ?? null
}

export async function initializeWorkspaceData() {
  if (workspaceInitialized) {
    return
  }

  if (workspaceInitializationPromise) {
    return workspaceInitializationPromise
  }

  workspaceInitializationPromise = loadWorkspaceData()

  try {
    await workspaceInitializationPromise
    workspaceInitialized = true
  } finally {
    workspaceInitializationPromise = null
  }
}

export async function saveCareProfile(profile: CareProfile) {
  const nextProfiles = [...getCareProfiles()]
  const existingIndex = nextProfiles.findIndex((entry) => entry.id === profile.id)

  if (existingIndex >= 0) {
    nextProfiles[existingIndex] = profile
  } else {
    nextProfiles.unshift(profile)
  }

  careProfilesStore = nextProfiles.map(normalizeCareProfile)
  writeStoredCareProfiles(careProfilesStore)
  try {
    await persistCareProfiles([profile])
  } catch (error) {
    console.error("Failed to sync care profile to Supabase:", error)
  }

  return profile
}

export async function deleteCareProfile(profileId: string) {
  careProfilesStore = getCareProfiles().filter((profile) => profile.id !== profileId)
  savedCaregiversStore = getSavedCaregiverLinks().filter((saved) => saved.careProfileId !== profileId)
  agencyHandoffRequestsStore = getAgencyHandoffRequests().filter((request) => request.careProfileId !== profileId)
  writeStoredCareProfiles(careProfilesStore)
  writeStoredSavedCaregivers(savedCaregiversStore)
  writeStoredAgencyHandoffRequests(agencyHandoffRequestsStore)

  if (hasSupabaseConfig()) {
    try {
      await deleteRows("care_profiles", { id: `eq.${profileId}` })
    } catch (error) {
      console.error("Failed to delete care profile from Supabase:", error)
    }
  }
}

export function getCaregivers() {
  return caregivers
}

export function getCaregiverById(caregiverId: string) {
  return caregivers.find((caregiver) => caregiver.id === caregiverId) ?? null
}

export function getSavedCaregiverLinks() {
  return savedCaregiversStore
}

export function isCaregiverSavedForProfile(careProfileId: string, caregiverId: string) {
  return getSavedCaregiverLinks().some(
    (saved) => saved.careProfileId === careProfileId && saved.caregiverId === caregiverId,
  )
}

export async function saveCaregiverForProfile(careProfileId: string, caregiverId: string) {
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

  savedCaregiversStore = [newEntry, ...existingSaved]
  writeStoredSavedCaregivers(savedCaregiversStore)
  try {
    await persistSavedCaregivers([newEntry])
  } catch (error) {
    console.error("Failed to sync saved caregiver to Supabase:", error)
  }

  return newEntry
}

export async function removeSavedCaregiverForProfile(careProfileId: string, caregiverId: string) {
  savedCaregiversStore = getSavedCaregiverLinks().filter(
    (entry) => !(entry.careProfileId === careProfileId && entry.caregiverId === caregiverId),
  )
  writeStoredSavedCaregivers(savedCaregiversStore)

  if (hasSupabaseConfig()) {
    try {
      await deleteRows("saved_caregivers", {
        care_profile_id: `eq.${careProfileId}`,
        caregiver_id: `eq.${caregiverId}`,
      })
    } catch (error) {
      console.error("Failed to delete saved caregiver from Supabase:", error)
    }
  }
}

export function getAgencyHandoffRequests() {
  return agencyHandoffRequestsStore
}

export function getLatestAgencyHandoffForProfile(careProfileId: string) {
  return (
    getAgencyHandoffRequests()
      .filter((entry) => entry.careProfileId === careProfileId)
      .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt))[0] ??
    null
  )
}

export async function createAgencyHandoffRequest(input: {
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

  agencyHandoffRequestsStore = [nextEntry, ...getAgencyHandoffRequests()]
  writeStoredAgencyHandoffRequests(agencyHandoffRequestsStore)
  try {
    await persistAgencyHandoffs([nextEntry])
  } catch (error) {
    console.error("Failed to sync agency handoff to Supabase:", error)
  }

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
    preferredLanguages: profile.preferredLanguages,
  }))
}

export function getSavedCaregiverGalleryData(): WorkspaceSavedCaregiverCard[] {
  const profiles = getCareProfiles()
  const rankedMatchesByProfileId = new Map(
    profiles.map((profile) => [
      profile.id,
      new Map(
        getRankedCaregiverMatches(profile, caregivers).map((result) => [result.caregiver.id, result]),
      ),
    ]),
  )

  return getSavedCaregiverLinks().flatMap((saved) => {
    const caregiver = caregivers.find((entry) => entry.id === saved.caregiverId)
    const profile = profiles.find((entry) => entry.id === saved.careProfileId)

    if (!caregiver || !profile) {
      return []
    }

    const matchedResult = rankedMatchesByProfileId.get(profile.id)?.get(caregiver.id) ?? null

    return [
      {
        id: saved.id,
        caregiverId: caregiver.id,
        careProfileId: profile.id,
        name: caregiver.name,
        agencyId: caregiver.agencyId,
        agency: caregiver.agencyName,
        summary: matchedResult?.summary ?? caregiver.bio,
        matchPercent: matchedResult?.matchPercent ?? null,
        note: `Saved for ${profile.name}`,
        traits: matchedResult?.traits ?? buildCaregiverSnapshotPills(caregiver),
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
    agencyId: result.caregiver.agencyId,
    agency: result.caregiver.agencyName,
    matchPercent: result.matchPercent,
    summary: result.summary,
    traits: result.traits,
    alert: result.alert,
    breakdown: result.breakdown
      .filter((item) => item.maxScore > 0)
      .map((item) => toSearchBreakdownItem(item, result.caregiver, profile.preferredLanguages)),
  }))
}

export function getBrowseCaregiverGalleryData(): SearchCaregiverCard[] {
  return caregivers.map((caregiver) => ({
    id: caregiver.id,
    name: caregiver.name,
    agencyId: caregiver.agencyId,
    agency: caregiver.agencyName,
    matchPercent: null,
    summary: caregiver.bio,
    traits: buildCaregiverSnapshotPills(caregiver),
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

function toSearchBreakdownItem(item: {
  key: string
  label: string
  score: number
  maxScore: number
  matchedValues: string[]
  missingValues: string[]
}, caregiver: Caregiver, preferredLanguages: string[]): SearchCaregiverBreakdownItem {
  const scorePercent = item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : 0

  if (item.key === "language") {
    return {
      key: item.key,
      label: item.label,
      scorePercent,
      summary: getCaregiverLanguageDisplay(caregiver, preferredLanguages),
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


function normalizeCareProfile(profile: CareProfile) {
  const preferredLanguages = Array.isArray(profile.preferredLanguages)
    ? profile.preferredLanguages.map((value) => value.trim()).filter(Boolean)
    : profile.preferredLanguage
      ? [profile.preferredLanguage.trim()].filter(Boolean)
      : []

  return {
    ...profile,
    preferredLanguage: profile.preferredLanguage?.trim?.() ?? preferredLanguages[0] ?? "",
    preferredLanguages,
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
    return Array.isArray(parsedValue) ? parsedValue.map(normalizeCareProfile) : null
  } catch {
    return null
  }
}

function writeStoredCareProfiles(profiles: CareProfile[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(CARE_PROFILES_STORAGE_KEY, JSON.stringify(profiles.map(normalizeCareProfile)))
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

async function loadWorkspaceData() {
  const fallbackProfiles = readStoredCareProfiles() ?? careProfiles
  const fallbackSavedCaregivers = readStoredSavedCaregivers() ?? savedCaregivers
  const fallbackAgencyHandoffs = readStoredAgencyHandoffRequests() ?? []

  careProfilesStore = fallbackProfiles.map(normalizeCareProfile)
  savedCaregiversStore = fallbackSavedCaregivers
  agencyHandoffRequestsStore = fallbackAgencyHandoffs

  if (!hasSupabaseConfig()) {
    return
  }

  try {
    const [remoteProfiles, remoteSavedCaregivers, remoteAgencyHandoffs] = await Promise.all([
      selectRows<CareProfileRow>("care_profiles", { order: "updated_at.desc" }),
      selectRows<SavedCaregiverRow>("saved_caregivers", { order: "saved_at.desc" }),
      selectRows<AgencyHandoffRow>("agency_handoffs", { order: "submitted_at.desc" }),
    ])

    if (remoteProfiles.length === 0 && careProfilesStore.length > 0) {
      await persistCareProfiles(careProfilesStore)
    } else {
      careProfilesStore = remoteProfiles.map(fromCareProfileRow)
      writeStoredCareProfiles(careProfilesStore)
    }

    if (remoteSavedCaregivers.length === 0 && savedCaregiversStore.length > 0) {
      await persistSavedCaregivers(savedCaregiversStore)
    } else {
      savedCaregiversStore = remoteSavedCaregivers.map(fromSavedCaregiverRow)
      writeStoredSavedCaregivers(savedCaregiversStore)
    }

    if (remoteAgencyHandoffs.length === 0 && agencyHandoffRequestsStore.length > 0) {
      await persistAgencyHandoffs(agencyHandoffRequestsStore)
    } else {
      agencyHandoffRequestsStore = remoteAgencyHandoffs.map(fromAgencyHandoffRow)
      writeStoredAgencyHandoffRequests(agencyHandoffRequestsStore)
    }
  } catch (error) {
    console.error("Failed to initialize workspace data from Supabase:", error)
  }
}

async function persistCareProfiles(profiles: CareProfile[]) {
  if (!hasSupabaseConfig() || profiles.length === 0) {
    return
  }

  await upsertRows("care_profiles", profiles.map(toCareProfileRow), "id")
}

async function persistSavedCaregivers(savedLinks: SavedCaregiver[]) {
  if (!hasSupabaseConfig() || savedLinks.length === 0) {
    return
  }

  await upsertRows(
    "saved_caregivers",
    savedLinks.map(toSavedCaregiverRow),
    "care_profile_id,caregiver_id",
  )
}

async function persistAgencyHandoffs(requests: AgencyHandoffRequest[]) {
  if (!hasSupabaseConfig() || requests.length === 0) {
    return
  }

  await upsertRows("agency_handoffs", requests.map(toAgencyHandoffRow), "id")
}

function toCareProfileRow(profile: CareProfile): CareProfileRow {
  const normalizedProfile = normalizeCareProfile(profile)

  return {
    id: normalizedProfile.id,
    name: normalizedProfile.name,
    age: normalizedProfile.age,
    gender: normalizedProfile.gender,
    preferred_language: normalizedProfile.preferredLanguage,
    preferred_languages: normalizedProfile.preferredLanguages,
    conditions: normalizedProfile.conditions,
    daily_care_tasks: normalizedProfile.dailyCareTasks,
    mobility_support: normalizedProfile.mobilitySupport,
    medication_support: normalizedProfile.medicationSupport,
    household_context: normalizedProfile.householdContext,
    risk_notes: normalizedProfile.riskNotes,
    additional_notes: normalizedProfile.additionalNotes,
    created_at: normalizedProfile.createdAt,
    updated_at: normalizedProfile.updatedAt,
  }
}

function fromCareProfileRow(row: CareProfileRow): CareProfile {
  return normalizeCareProfile({
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    preferredLanguage: row.preferred_language,
    preferredLanguages: row.preferred_languages ?? [],
    conditions: row.conditions ?? [],
    dailyCareTasks: row.daily_care_tasks ?? [],
    mobilitySupport: row.mobility_support ?? [],
    medicationSupport: row.medication_support ?? [],
    householdContext: row.household_context ?? [],
    riskNotes: row.risk_notes ?? "",
    additionalNotes: row.additional_notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function toSavedCaregiverRow(saved: SavedCaregiver): SavedCaregiverRow {
  return {
    id: saved.id,
    care_profile_id: saved.careProfileId,
    caregiver_id: saved.caregiverId,
    saved_at: saved.savedAt,
  }
}

function fromSavedCaregiverRow(row: SavedCaregiverRow): SavedCaregiver {
  return {
    id: row.id,
    careProfileId: row.care_profile_id,
    caregiverId: row.caregiver_id,
    savedAt: row.saved_at,
  }
}

function toAgencyHandoffRow(request: AgencyHandoffRequest): AgencyHandoffRow {
  return {
    id: request.id,
    care_profile_id: request.careProfileId,
    agency_id: request.agencyId,
    caregiver_ids: request.caregiverIds,
    note: request.note,
    submitted_at: request.submittedAt,
  }
}

function fromAgencyHandoffRow(row: AgencyHandoffRow): AgencyHandoffRequest {
  return {
    id: row.id,
    careProfileId: row.care_profile_id,
    agencyId: row.agency_id,
    caregiverIds: row.caregiver_ids ?? [],
    note: row.note ?? "",
    submittedAt: row.submitted_at,
  }
}
