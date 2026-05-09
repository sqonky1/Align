import type {
  CaregiverOnboardingDraftState,
  CaregiverProfileDraft,
  ExtractionAuditRecord,
  SourceMode,
  ValidationIssue,
} from "./types"
import {
  deleteAppStateValue,
  hasSupabaseConfig,
  readAppStateValue,
  selectRows,
  upsertRows,
  writeAppStateValue,
} from "../../lib/supabaseRest"

const CAREGIVER_ONBOARDING_STORAGE_KEY = "align.caregiverOnboardingProfiles"
const CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY = "align.caregiverOnboardingDraft"
const CAREGIVER_ONBOARDING_DRAFT_STATE_KEY = "caregiver_onboarding_draft"

type CaregiverOnboardingProfileRow = {
  id: string
  full_name: string
  nationality: string | null
  phone: string | null
  source_mode: SourceMode
  created_at: string
  profile: CaregiverProfileDraft
  audit: ExtractionAuditRecord | null
  validation_issues: ValidationIssue[]
}

let caregiverOnboardingProfilesStore: StoredCaregiverOnboardingProfile[] = []
let caregiverOnboardingDraftStore: CaregiverOnboardingDraftState | null = null
let onboardingStorageInitialized = false
let onboardingStorageInitializationPromise: Promise<void> | null = null
let onboardingDraftPersistTimeout: number | null = null

export type StoredCaregiverOnboardingProfile = {
  id: string
  full_name: string
  nationality: string | null
  phone: string | null
  source_mode: SourceMode
  created_at: string
  profile: CaregiverProfileDraft
  audit: ExtractionAuditRecord | null
  validation_issues: ValidationIssue[]
}

export function getStoredCaregiverOnboardingProfiles(): StoredCaregiverOnboardingProfile[] {
  return caregiverOnboardingProfilesStore
}

export async function initializeCaregiverOnboardingStorage() {
  if (onboardingStorageInitialized) {
    return
  }

  if (onboardingStorageInitializationPromise) {
    return onboardingStorageInitializationPromise
  }

  onboardingStorageInitializationPromise = loadCaregiverOnboardingStorage()

  try {
    await onboardingStorageInitializationPromise
    onboardingStorageInitialized = true
  } finally {
    onboardingStorageInitializationPromise = null
  }
}

export async function saveCaregiverOnboardingProfile(input: {
  values: CaregiverProfileDraft
  source_mode: SourceMode
  audit: ExtractionAuditRecord | null
  validation_issues: ValidationIssue[]
}) {
  const nextEntry: StoredCaregiverOnboardingProfile = {
    id: `cg-onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    full_name: input.values.full_name ?? "Unnamed helper",
    nationality: input.values.nationality,
    phone: input.values.phone,
    source_mode: input.source_mode,
    created_at: new Date().toISOString(),
    profile: structuredClone(input.values),
    audit: input.audit,
    validation_issues: input.validation_issues,
  }

  caregiverOnboardingProfilesStore = [nextEntry, ...getStoredCaregiverOnboardingProfiles()]
  writeStoredProfilesToLocal(caregiverOnboardingProfilesStore)

  if (hasSupabaseConfig()) {
    try {
      await upsertRows("caregiver_onboarding_profiles", [toCaregiverOnboardingProfileRow(nextEntry)], "id")
    } catch (error) {
      console.error("Failed to sync caregiver onboarding profile to Supabase:", error)
    }
  }

  return nextEntry
}

export function getStoredCaregiverOnboardingDraft(): CaregiverOnboardingDraftState | null {
  return caregiverOnboardingDraftStore
}

export function writeStoredCaregiverOnboardingDraft(draft: CaregiverOnboardingDraftState) {
  caregiverOnboardingDraftStore = draft
  writeStoredDraftToLocal(draft)
  scheduleDraftPersistence(draft)
}

export function clearStoredCaregiverOnboardingDraft() {
  caregiverOnboardingDraftStore = null

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY)
  }

  if (onboardingDraftPersistTimeout !== null && typeof window !== "undefined") {
    window.clearTimeout(onboardingDraftPersistTimeout)
    onboardingDraftPersistTimeout = null
  }

  if (hasSupabaseConfig()) {
    void deleteAppStateValue(CAREGIVER_ONBOARDING_DRAFT_STATE_KEY).catch((error) => {
      console.error("Failed to clear caregiver onboarding draft from Supabase:", error)
    })
  }
}

async function loadCaregiverOnboardingStorage() {
  caregiverOnboardingProfilesStore = readStoredProfilesFromLocal()
  caregiverOnboardingDraftStore = readStoredDraftFromLocal()

  if (!hasSupabaseConfig()) {
    return
  }

  try {
    const [remoteProfiles, remoteDraft] = await Promise.all([
      selectRows<CaregiverOnboardingProfileRow>("caregiver_onboarding_profiles", {
        order: "created_at.desc",
      }),
      readAppStateValue<CaregiverOnboardingDraftState>(CAREGIVER_ONBOARDING_DRAFT_STATE_KEY),
    ])

    if (remoteProfiles.length === 0 && caregiverOnboardingProfilesStore.length > 0) {
      await upsertRows(
        "caregiver_onboarding_profiles",
        caregiverOnboardingProfilesStore.map(toCaregiverOnboardingProfileRow),
        "id",
      )
    } else {
      caregiverOnboardingProfilesStore = remoteProfiles.map(fromCaregiverOnboardingProfileRow)
      writeStoredProfilesToLocal(caregiverOnboardingProfilesStore)
    }

    if (remoteDraft === null) {
      if (caregiverOnboardingDraftStore !== null) {
        await writeAppStateValue(CAREGIVER_ONBOARDING_DRAFT_STATE_KEY, caregiverOnboardingDraftStore)
      }
    } else {
      caregiverOnboardingDraftStore = remoteDraft
      writeStoredDraftToLocal(remoteDraft)
    }
  } catch (error) {
    console.error("Failed to initialize caregiver onboarding storage from Supabase:", error)
  }
}

function scheduleDraftPersistence(draft: CaregiverOnboardingDraftState) {
  if (!hasSupabaseConfig() || typeof window === "undefined") {
    return
  }

  if (onboardingDraftPersistTimeout !== null) {
    window.clearTimeout(onboardingDraftPersistTimeout)
  }

  onboardingDraftPersistTimeout = window.setTimeout(() => {
    onboardingDraftPersistTimeout = null
    void writeAppStateValue(CAREGIVER_ONBOARDING_DRAFT_STATE_KEY, draft).catch((error) => {
      console.error("Failed to persist caregiver onboarding draft to Supabase:", error)
    })
  }, 300)
}

function readStoredProfilesFromLocal() {
  if (typeof window === "undefined") {
    return []
  }

  const raw = window.localStorage.getItem(CAREGIVER_ONBOARDING_STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredProfilesToLocal(profiles: StoredCaregiverOnboardingProfile[]) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(CAREGIVER_ONBOARDING_STORAGE_KEY, JSON.stringify(profiles))
}

function readStoredDraftFromLocal() {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as CaregiverOnboardingDraftState
  } catch {
    return null
  }
}

function writeStoredDraftToLocal(draft: CaregiverOnboardingDraftState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function toCaregiverOnboardingProfileRow(
  profile: StoredCaregiverOnboardingProfile,
): CaregiverOnboardingProfileRow {
  return {
    id: profile.id,
    full_name: profile.full_name,
    nationality: profile.nationality,
    phone: profile.phone,
    source_mode: profile.source_mode,
    created_at: profile.created_at,
    profile: profile.profile,
    audit: profile.audit,
    validation_issues: profile.validation_issues,
  }
}

function fromCaregiverOnboardingProfileRow(
  row: CaregiverOnboardingProfileRow,
): StoredCaregiverOnboardingProfile {
  return {
    id: row.id,
    full_name: row.full_name,
    nationality: row.nationality,
    phone: row.phone,
    source_mode: row.source_mode,
    created_at: row.created_at,
    profile: row.profile,
    audit: row.audit,
    validation_issues: row.validation_issues ?? [],
  }
}
