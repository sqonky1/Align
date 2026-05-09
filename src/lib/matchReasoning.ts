import type { CareProfile, Caregiver } from "../types"
import type { CaregiverMatchResult } from "./matching"

const MATCH_REASONING_STORAGE_KEY = "align.matchReasoningCache"

type MatchReasoningCache = Record<string, string>

export async function getMatchReasoning(
  profile: CareProfile,
  caregiver: Caregiver,
  matchResult: CaregiverMatchResult,
) {
  const cacheKey = getMatchReasoningCacheKey(profile.id, caregiver.id)
  const cachedReasoning = readMatchReasoningCache()[cacheKey]

  if (cachedReasoning) {
    return cachedReasoning
  }

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

  writeMatchReasoningCache(cacheKey, data.reasoning)
  return data.reasoning
}

function getMatchReasoningCacheKey(profileId: string, caregiverId: string) {
  return `${profileId}:${caregiverId}`
}

function readMatchReasoningCache(): MatchReasoningCache {
  if (typeof window === "undefined") {
    return {}
  }

  const rawValue = window.localStorage.getItem(MATCH_REASONING_STORAGE_KEY)

  if (!rawValue) {
    return {}
  }

  try {
    return JSON.parse(rawValue) as MatchReasoningCache
  } catch {
    return {}
  }
}

function writeMatchReasoningCache(cacheKey: string, reasoning: string) {
  if (typeof window === "undefined") {
    return
  }

  const currentCache = readMatchReasoningCache()
  currentCache[cacheKey] = reasoning
  window.localStorage.setItem(MATCH_REASONING_STORAGE_KEY, JSON.stringify(currentCache))
}
