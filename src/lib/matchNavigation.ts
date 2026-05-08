export const MATCH_LOADING_PARAM_KEY = "matchLoading"
export const MATCH_LOADING_PARAM_VALUE = "1"
const MATCH_LOADING_DURATION_MS = 500

export function getMatchSearchHref(profileId: string) {
  const params = new URLSearchParams({
    profile: profileId,
    [MATCH_LOADING_PARAM_KEY]: MATCH_LOADING_PARAM_VALUE,
  })

  return `/search?${params.toString()}`
}

export function getMatchLoadingDurationMs() {
  return MATCH_LOADING_DURATION_MS
}

