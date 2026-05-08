import { getCaregiverLanguageDisplay } from "./matching"
import type { Caregiver, SearchCaregiverPill } from "../types"

export function buildCaregiverSnapshotPills(caregiver: Caregiver): SearchCaregiverPill[] {
  return [
    {
      label: getCaregiverLanguageDisplay(caregiver),
      tone: "strong",
    },
    {
      label: formatDisplayLabel(caregiver.careConditions[0] ?? "general support"),
      tone: "partial",
    },
    {
      label: `${caregiver.yearsOfExperience} years`,
      tone: "strong",
    },
  ]
}

function formatDisplayLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}
