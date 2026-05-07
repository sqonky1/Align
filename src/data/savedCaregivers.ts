import type { SavedCaregiver, SearchPreviewResult } from "../types"

export const savedCaregivers: SavedCaregiver[] = [
  {
    id: "saved-1",
    careProfileId: "profile-1",
    caregiverId: "cg-1",
    savedAt: "2026-05-08T00:00:00.000Z",
  },
  {
    id: "saved-2",
    careProfileId: "profile-2",
    caregiverId: "cg-10",
    savedAt: "2026-05-08T00:00:00.000Z",
  },
]

export const searchPreviewResults: SearchPreviewResult[] = [
  {
    careProfileId: "profile-1",
    caregiverId: "cg-1",
    matchPercent: 89,
    summary:
      "Mandarin speaking with strong dementia routine support and relevant diabetes care exposure.",
    traits: ["Language fit", "Dementia care", "8 years"],
  },
  {
    careProfileId: "profile-1",
    caregiverId: "cg-2",
    matchPercent: 78,
    summary:
      "Strong day-to-day eldercare support with useful mobility handling and medication reminder experience.",
    traits: ["Mandarin", "Transfer support", "6 years"],
  },
  {
    careProfileId: "profile-1",
    caregiverId: "cg-15",
    matchPercent: 74,
    summary:
      "Warm dementia support profile with feeding and companionship experience for lower-intensity routines.",
    traits: ["Companionship", "Feeding", "5 years"],
  },
  {
    careProfileId: "profile-1",
    caregiverId: "cg-12",
    matchPercent: 71,
    summary:
      "Broad eldercare support with Mandarin coverage and helpful fall-risk monitoring experience.",
    traits: ["Fall-risk support", "Mandarin", "5 years"],
  },
]
