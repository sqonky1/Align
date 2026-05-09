import type { CareProfile, Caregiver } from "../types"
import type { CaregiverMatchResult } from "./matching"
import {
  hasSupabaseConfig,
  readAppStateValue,
  writeAppStateValue,
} from "./supabaseRest"

const MATCH_REASONING_STORAGE_KEY = "align.matchReasoningCache"

type MatchReasoningCache = Record<string, string>

let matchReasoningCacheStore: MatchReasoningCache = {}
let matchReasoningInitialized = false
let matchReasoningInitializationPromise: Promise<void> | null = null

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

export async function initializeMatchReasoningCache() {
  if (matchReasoningInitialized) {
    return
  }

  if (matchReasoningInitializationPromise) {
    return matchReasoningInitializationPromise
  }

  matchReasoningInitializationPromise = loadMatchReasoningCache()

  try {
    await matchReasoningInitializationPromise
    matchReasoningInitialized = true
  } finally {
    matchReasoningInitializationPromise = null
  }
}

function getMatchReasoningCacheKey(profileId: string, caregiverId: string) {
  return `${profileId}:${caregiverId}`
}

function readMatchReasoningCache(): MatchReasoningCache {
  return matchReasoningCacheStore
}

function writeMatchReasoningCache(cacheKey: string, reasoning: string) {
  const currentCache = readMatchReasoningCache()
  currentCache[cacheKey] = reasoning
  matchReasoningCacheStore = currentCache

  if (typeof window !== "undefined") {
    window.localStorage.setItem(MATCH_REASONING_STORAGE_KEY, JSON.stringify(currentCache))
  }

  if (hasSupabaseConfig()) {
    void writeAppStateValue(MATCH_REASONING_STORAGE_KEY, currentCache).catch((error) => {
      console.error("Failed to persist match reasoning cache to Supabase:", error)
    })
  }
}

async function loadMatchReasoningCache() {
  matchReasoningCacheStore = readLocalMatchReasoningCache()

  if (!hasSupabaseConfig()) {
    return
  }

  try {
    const remoteCache = await readAppStateValue<MatchReasoningCache>(MATCH_REASONING_STORAGE_KEY)

    if (remoteCache === null) {
      if (Object.keys(matchReasoningCacheStore).length > 0) {
        await writeAppStateValue(MATCH_REASONING_STORAGE_KEY, matchReasoningCacheStore)
      }

      return
    }

    matchReasoningCacheStore = remoteCache

    if (typeof window !== "undefined") {
      window.localStorage.setItem(MATCH_REASONING_STORAGE_KEY, JSON.stringify(remoteCache))
    }
  } catch (error) {
    console.error("Failed to initialize match reasoning cache from Supabase:", error)
  }
}

function readLocalMatchReasoningCache(): MatchReasoningCache {
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
