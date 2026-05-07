import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import { PageHeader } from "../components/layout/PageHeader"
import {
  getBrowseCaregiverGalleryData,
  getCareProfileCardData,
  getCareProfileById,
  getRankedCaregiverGalleryData,
} from "../lib/data"
import type { SearchCaregiverBreakdownItem } from "../types"

export function SearchPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const activeProfileId = searchParams.get("profile")
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
  const isMatchedMode = Boolean(activeProfile)
  const careProfiles = getCareProfileCardData()
  const searchResults = activeProfile
    ? getRankedCaregiverGalleryData(activeProfile)
    : getBrowseCaregiverGalleryData()
  const featuredResults = isMatchedMode ? searchResults.slice(0, 3) : []
  const remainingResults = isMatchedMode ? searchResults.slice(3) : searchResults

  function handleProfileSelect(profileId: string) {
    setIsPickerOpen(false)
    navigate(`/search?profile=${profileId}`)
  }

  return (
    <section className="page-section">
      <PageHeader title="Search" description="" />

      <section className="search-stage">
        {isMatchedMode && activeProfile ? (
          <section className="search-profile-stage" aria-label="Anchor profile">
            <CareProfileCard profile={activeProfile} showActions={false} variant="anchor" />
            <div className="search-results-meta">
              <p className="panel-label">Results</p>
              <p className="toolbar-caption">{searchResults.length} caregivers ranked by structured fit</p>
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

        {isMatchedMode ? (
          <>
            <section className="ranked-featured-list" aria-label="Top ranked caregivers">
              {featuredResults.map((caregiver, index) => (
                <Link
                  className={`caregiver-card caregiver-card-link caregiver-card-ranked ${getFeaturedCardClass(index)}`}
                  key={caregiver.id}
                  to={getCaregiverDetailHref(caregiver.id, activeProfile?.id)}
                >
                  <div className="ranked-card-header">
                    <div className="ranked-card-heading">
                      <span className="rank-token">#{index + 1}</span>
                      <div>
                        <h2>{caregiver.name}</h2>
                        <p className="agency-line">{caregiver.agency}</p>
                      </div>
                    </div>

                    {caregiver.matchPercent !== null ? (
                      <span className="score-token">{caregiver.matchPercent}% match</span>
                    ) : null}
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
                </Link>
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
                  variant="picker"
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
