import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import { PageHeader } from "../components/layout/PageHeader"
import {
  getBrowseCaregiverGalleryData,
  getCareProfileCardData,
  getCareProfileById,
  getRankedCaregiverGalleryData,
  isCaregiverSavedForProfile,
  removeSavedCaregiverForProfile,
  saveCaregiverForProfile,
} from "../lib/data"
import {
  getMatchLoadingDurationMs,
  getMatchSearchHref,
  MATCH_LOADING_PARAM_KEY,
  MATCH_LOADING_PARAM_VALUE,
} from "../lib/matchNavigation"
import type { SearchCaregiverBreakdownItem } from "../types"

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isMatchLoading, setIsMatchLoading] = useState(false)
  const matchLoadingTimeoutRef = useRef<number | null>(null)
  const activeProfileId = searchParams.get("profile")
  const matchLoadingParam = searchParams.get(MATCH_LOADING_PARAM_KEY)
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
  const isMatchedMode = Boolean(activeProfile)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const careProfiles = getCareProfileCardData()
  const searchResults = activeProfile
    ? getRankedCaregiverGalleryData(activeProfile)
    : getBrowseCaregiverGalleryData()
  const featuredResults = isMatchedMode ? searchResults.slice(0, 3) : []
  const remainingResults = isMatchedMode ? searchResults.slice(3) : searchResults

  useEffect(() => {
    if (!activeProfileId) {
      setSavedIds([])
      return
    }

    const profile = getCareProfileById(activeProfileId)

    if (!profile) {
      setSavedIds([])
      return
    }

    setSavedIds(
      getRankedCaregiverGalleryData(profile)
        .filter((caregiver) => isCaregiverSavedForProfile(activeProfileId, caregiver.id))
        .map((caregiver) => caregiver.id),
    )
  }, [activeProfileId])

  useEffect(() => {
    if (!activeProfileId || matchLoadingParam !== MATCH_LOADING_PARAM_VALUE) {
      return
    }

    if (matchLoadingTimeoutRef.current !== null) {
      window.clearTimeout(matchLoadingTimeoutRef.current)
    }

    setIsMatchLoading(true)
    matchLoadingTimeoutRef.current = window.setTimeout(() => {
      const params = new URLSearchParams({ profile: activeProfileId })
      navigate(`/search?${params.toString()}`, { replace: true })
      setIsMatchLoading(false)
      matchLoadingTimeoutRef.current = null
    }, getMatchLoadingDurationMs())
  }, [activeProfileId, matchLoadingParam, navigate])

  useEffect(() => {
    return () => {
      if (matchLoadingTimeoutRef.current !== null) {
        window.clearTimeout(matchLoadingTimeoutRef.current)
      }
    }
  }, [])

  function handleProfileSelect(profileId: string) {
    setIsPickerOpen(false)
    navigate(getMatchSearchHref(profileId))
  }

  function handleFeaturedCardSelect(caregiverId: string) {
    navigate(getCaregiverDetailHref(caregiverId, activeProfile?.id))
  }

  function handleToggleSave(caregiverId: string) {
    if (!activeProfileId) {
      return
    }

    const isSaved = savedIds.includes(caregiverId)

    if (isSaved) {
      removeSavedCaregiverForProfile(activeProfileId, caregiverId)
      setSavedIds((current) => current.filter((id) => id !== caregiverId))
      return
    }

    saveCaregiverForProfile(activeProfileId, caregiverId)
    setSavedIds((current) => [...current, caregiverId])
  }

  return (
    <section className="page-section">
      <PageHeader title="Search" description="" />

      <div className="search-content-shell">
        <section className="search-stage">
          {isMatchedMode && activeProfile ? (
            <section className="search-profile-stage" aria-label="Anchor profile">
              <CareProfileCard profile={activeProfile} showActions={false} variant="anchor" />
              <div className="search-results-meta">
                <p className="panel-label">Results</p>
                <p className="toolbar-caption">{searchResults.length} caregivers ranked by structured fit</p>
                <p className="toolbar-caption">
                  {savedIds.length} shortlisted for {activeProfile.name}.{" "}
                  <Link className="inline-action" to={`/profiles/${activeProfile.id}`}>
                    Review shortlist
                  </Link>
                </p>
              </div>
            </section>
          ) : (
            <div className="search-browse-actions">
              <button
                className="button-secondary"
                onClick={() => setIsPickerOpen(true)}
                type="button"
              >
                Match to care recipient
              </button>
              <p className="toolbar-caption">{searchResults.length} caregivers available to browse</p>
            </div>
          )}

          {isMatchLoading ? (
            <section className="match-loading-stage" aria-live="polite" aria-busy="true">
              <div className="section-header section-header-tight">
                <h2>Finding caregiver matches...</h2>
                <p className="toolbar-caption">Ranking profiles based on selected care needs.</p>
              </div>

              <div className="match-loading-grid" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => (
                  <article className="caregiver-card caregiver-card-skeleton" key={`skeleton-${index}`}>
                    <div className="skeleton-line skeleton-line-heading" />
                    <div className="skeleton-line skeleton-line-subheading" />
                    <div className="skeleton-block" />
                    <div className="skeleton-chip-row">
                      <span className="skeleton-chip" />
                      <span className="skeleton-chip" />
                      <span className="skeleton-chip" />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : isMatchedMode ? (
            <>
              <section className="ranked-featured-list" aria-label="Top ranked caregivers">
                {featuredResults.map((caregiver, index) => (
                  <article
                    aria-label={`Open ${caregiver.name} profile`}
                    className={`caregiver-card caregiver-card-ranked ${getFeaturedCardClass(index)}`}
                    key={caregiver.id}
                    onClick={() => handleFeaturedCardSelect(caregiver.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        handleFeaturedCardSelect(caregiver.id)
                      }
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    <div className="ranked-card-header">
                      <div className="ranked-card-heading">
                        <span className="rank-token">#{index + 1}</span>
                        <div>
                          <h2>{caregiver.name}</h2>
                          <p className="agency-line">{caregiver.agency}</p>
                        </div>
                      </div>

                      <div className="ranked-card-actions">
                        {caregiver.matchPercent !== null ? (
                          <span className="score-token">{caregiver.matchPercent}% match</span>
                        ) : null}
                        <button
                          className={`button-secondary shortlist-toggle ${savedIds.includes(caregiver.id) ? "shortlist-toggle-active" : ""}`}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleToggleSave(caregiver.id)
                          }}
                          type="button"
                        >
                          {savedIds.includes(caregiver.id) ? "Saved" : "Shortlist"}
                        </button>
                      </div>
                    </div>

                    <div className="ranked-card-body">
                      <div className="ranked-card-portrait">
                        <div className="portrait-frame">
                          <span>{caregiver.name.charAt(0)}</span>
                        </div>
                      </div>

                      <div className="caregiver-card-copy">
                        <p className="result-summary">{caregiver.summary}</p>
                        {caregiver.alert ? <p className="fit-alert">{caregiver.alert}</p> : null}

                        <div className="breakdown-chip-list" aria-label={`${caregiver.name} fit breakdown`}>
                          {caregiver.breakdown.map((item) => (
                            <span
                              className={`breakdown-chip ${getBreakdownStatusClass(item)}`}
                              key={item.key}
                            >
                              {item.label}: {item.summary}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              {remainingResults.length > 0 ? (
                <section className="section-shell">
                  <div className="section-header section-header-tight">
                    <h2>More caregivers</h2>
                  </div>

                  <div className="matched-gallery-grid" aria-label="More ranked caregivers">
                    {remainingResults.map((caregiver, index) => (
                      <CaregiverCard
                        agency={caregiver.agency}
                        compact
                        cornerText={`#${index + 4}`}
                        href={getCaregiverDetailHref(caregiver.id, activeProfile?.id)}
                        key={caregiver.id}
                        matchPercent={caregiver.matchPercent}
                        name={caregiver.name}
                        traits={caregiver.traits}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <div className="gallery-grid" aria-label="Caregiver search results">
              {remainingResults.map((caregiver) => (
                <CaregiverCard
                  agency={caregiver.agency}
                  href={getCaregiverDetailHref(caregiver.id)}
                  key={caregiver.id}
                  name={caregiver.name}
                  summary={caregiver.summary}
                  traits={caregiver.traits}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {isPickerOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setIsPickerOpen(false)}
          role="dialog"
        >
          <div
            className="modal-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header section-header-tight modal-header">
              <div>
                <h2>Choose a care recipient</h2>
                <p className="toolbar-caption">Select a care profile to run matching.</p>
              </div>
              <button
                aria-label="Close match picker"
                className="modal-close"
                onClick={() => setIsPickerOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="profile-card-grid" aria-label="Care recipient options">
              {careProfiles.map((profile) => (
                <CareProfileCard
                  key={profile.id}
                  onSelect={() => handleProfileSelect(profile.id)}
                  profile={profile}
                  showActions={false}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function getBreakdownStatusClass(item: SearchCaregiverBreakdownItem) {
  if (item.scorePercent === 100) {
    return "breakdown-chip-strong"
  }

  if (item.scorePercent === 0) {
    return "breakdown-chip-gap"
  }

  return "breakdown-chip-partial"
}

function getFeaturedCardClass(index: number) {
  if (index === 0) {
    return "caregiver-card-rank-gold"
  }

  if (index === 1) {
    return "caregiver-card-rank-silver"
  }

  return "caregiver-card-rank-bronze"
}

function getCaregiverDetailHref(caregiverId: string, profileId?: string) {
  return profileId ? `/caregivers/${caregiverId}?profile=${profileId}` : `/caregivers/${caregiverId}`
}
