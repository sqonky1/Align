import type { CareProfile, Caregiver } from "../types"
import type { CaregiverMatchResult } from "./matching"

export async function getMatchReasoning(
  profile: CareProfile,
  caregiver: Caregiver,
  matchResult: CaregiverMatchResult,
) {
  const response = await fetch("/api/match-reasoning", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      caregiver,
      matchPercent: matchResult.matchPercent,
      profile,
      breakdown: matchResult.breakdown,
      summary: matchResult.summary,
      alert: matchResult.alert,
    }),
  })

  if (!response.ok) {
    throw new Error(`Match reasoning request failed with status ${response.status}.`)
  }

  const data = (await response.json()) as { reasoning?: string }

  if (!data.reasoning) {
    throw new Error("Match reasoning response did not include reasoning text.")
  }

  return data.reasoning
}
