import type { CareProfile, Caregiver } from "../types"
import type { CaregiverMatchResult } from "./matching"

export type TrainingRecommendation = {
  title: string
  url: string
  reason: string
}

export type TrainingRecommendationResult = {
  recommendations: TrainingRecommendation[]
}

export async function getTrainingRecommendations(
  profile: CareProfile,
  caregiver: Caregiver,
  matchResult: CaregiverMatchResult,
) {
  const response = await fetch("/api/training-recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      caregiver,
      matchPercent: matchResult.matchPercent,
      profile,
      breakdown: matchResult.breakdown,
    }),
  })

  if (!response.ok) {
    throw new Error(`Training recommendation request failed with status ${response.status}.`)
  }

  const data = (await response.json()) as Partial<TrainingRecommendationResult>

  if (!Array.isArray(data.recommendations)) {
    throw new Error("Training recommendation response did not include the expected payload.")
  }

  return {
    recommendations: data.recommendations.filter(isTrainingRecommendation),
  }
}

function isTrainingRecommendation(value: unknown): value is TrainingRecommendation {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.title === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.reason === "string"
  )
}
