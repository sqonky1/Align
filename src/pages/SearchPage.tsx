import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import { PageHeader } from "../components/layout/PageHeader"
import {
  getBrowseCaregiverGalleryData,
  getCareProfileCardData,
  getCareProfileById,
  getRankedCaregiverGalleryData,
} from "../lib/data"
import {
  getMatchLoadingDurationMs,
  getMatchSearchHref,
  MATCH_LOADING_PARAM_KEY,
  MATCH_LOADING_PARAM_VALUE,
} from "../lib/matchNavigation"
import { getRankAccentClass } from "../lib/rankAccents"

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const matchLoadingTimeoutRef = useRef<number | null>(null)
  const activeProfileId = searchParams.get("profile")
  const matchLoadingParam = searchParams.get(MATCH_LOADING_PARAM_KEY)
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
  const isMatchedMode = Boolean(activeProfile)
  const isMatchLoading = Boolean(
    activeProfileId && matchLoadingParam === MATCH_LOADING_PARAM_VALUE,
  )
  const careProfiles = getCareProfileCardData()
  const searchResults = activeProfile
    ? getRankedCaregiverGalleryData(activeProfile)
    : getBrowseCaregiverGalleryData()
  const featuredResults = isMatchedMode ? searchResults.slice(0, 3) : []
  const remainingResults = isMatchedMode ? searchResults.slice(3) : searchResults

  useEffect(() => {
    if (!activeProfileId || matchLoadingParam !== MATCH_LOADING_PARAM_VALUE) {
      return
    }

    if (matchLoadingTimeoutRef.current !== null) {
      window.clearTimeout(matchLoadingTimeoutRef.current)
    }

    matchLoadingTimeoutRef.current = window.setTimeout(() => {
      const params = new URLSearchParams({ profile: activeProfileId })
      navigate(`/search?${params.toString()}`, { replace: true })
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

  return (
    <section className="page-section">
      <PageHeader title="Search" description="" />

      <div className="search-content-shell">
        <section className="search-stage">
          {isMatchedMode && activeProfile ? (
            <section className="search-profile-stage" aria-label="Anchor profile">
              <CareProfileCard profile={activeProfile} showActions={false} variant="anchor" />
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
                  <CaregiverCard
                    agencyId={caregiver.agencyId}
                    agency={caregiver.agency}
                    className={`matched-gallery-card caregiver-card-ranked ${getRankAccentClass(index)}`}
                    cornerText={`#${index + 1}`}
                    href={getCaregiverDetailHref(caregiver.id, activeProfile?.id)}
                    key={caregiver.id}
                    matchPercent={caregiver.matchPercent}
                    name={caregiver.name}
                    summary={caregiver.summary}
                    traits={caregiver.traits}
                  />
                ))}
              </section>

              {remainingResults.length > 0 ? (
                <section className="section-shell">
                  <div className="matched-gallery-grid" aria-label="More ranked caregivers">
                    {remainingResults.map((caregiver, index) => (
                      <CaregiverCard
                        agencyId={caregiver.agencyId}
                        agency={caregiver.agency}
                        className="matched-gallery-card"
                        cornerText={`#${index + 4}`}
                        href={getCaregiverDetailHref(caregiver.id, activeProfile?.id)}
                        key={caregiver.id}
                        matchPercent={caregiver.matchPercent}
                        name={caregiver.name}
                        summary={caregiver.summary}
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
                  agencyId={caregiver.agencyId}
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

function getCaregiverDetailHref(caregiverId: string, profileId?: string) {
  return profileId ? `/caregivers/${caregiverId}?profile=${profileId}` : `/caregivers/${caregiverId}`
}
