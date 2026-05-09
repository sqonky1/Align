import type {
  CaregiverOnboardingDraftState,
  CaregiverProfileDraft,
  ExtractionAuditRecord,
  SourceMode,
  ValidationIssue,
} from "./types"

const CAREGIVER_ONBOARDING_STORAGE_KEY = "align.caregiverOnboardingProfiles"
const CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY = "align.caregiverOnboardingDraft"

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

export function saveCaregiverOnboardingProfile(input: {
  values: CaregiverProfileDraft
  source_mode: SourceMode
  audit: ExtractionAuditRecord | null
  validation_issues: ValidationIssue[]
}) {
  const current = getStoredCaregiverOnboardingProfiles()
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

  window.localStorage.setItem(
    CAREGIVER_ONBOARDING_STORAGE_KEY,
    JSON.stringify([nextEntry, ...current]),
  )

  return nextEntry
}

export function getStoredCaregiverOnboardingDraft(): CaregiverOnboardingDraftState | null {
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

export function writeStoredCaregiverOnboardingDraft(draft: CaregiverOnboardingDraftState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function clearStoredCaregiverOnboardingDraft() {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(CAREGIVER_ONBOARDING_DRAFT_STORAGE_KEY)
}
