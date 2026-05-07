import { Link, useSearchParams } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"
import {
  formatDisplayLabel,
  getBrowseCaregiverGalleryData,
  getCareProfileById,
  getRankedCaregiverGalleryData,
} from "../lib/data"
import type { SearchCaregiverBreakdownItem } from "../types"

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const activeProfileId = searchParams.get("profile")
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
  const isMatchedMode = Boolean(activeProfile)
  const activeProfileSignals = activeProfile
    ? [
        activeProfile.preferredLanguage || null,
        activeProfile.conditions[0] ? formatDisplayLabel(activeProfile.conditions[0]) : null,
        activeProfile.mobilitySupport[0]
          ? formatDisplayLabel(activeProfile.mobilitySupport[0])
          : null,
      ].filter((signal): signal is string => Boolean(signal))
    : []
  const searchResults = activeProfile
    ? getRankedCaregiverGalleryData(activeProfile)
    : getBrowseCaregiverGalleryData()
  const featuredResults = isMatchedMode ? searchResults.slice(0, 3) : []
  const remainingResults = isMatchedMode ? searchResults.slice(3) : searchResults

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Search"
        title={
          isMatchedMode
            ? "Rank caregivers against the active care profile."
            : "Browse caregivers, then apply a care profile for tailored matching."
        }
        description={
          isMatchedMode
            ? "Search now behaves like a ranked recommendation view: structured profile fields drive the order, language matters heavily, and each result shows why it landed where it did."
            : "Browse mode stays neutral. It shows the full caregiver dataset without pretending a profile-specific match score exists."
        }
      />

      <section className="search-stage">
        <div className="search-toolbar">
          <div>
            <p className="panel-label">
              {isMatchedMode ? "Active profile" : "Browse mode"}
            </p>
            <h2>{activeProfile?.name ?? "No care profile selected"}</h2>
            <p className="toolbar-caption">
              {isMatchedMode
                ? `${searchResults.length} caregivers ranked by structured fit`
                : `${searchResults.length} caregivers available to browse`}
            </p>
          </div>
          {isMatchedMode ? (
            <div className="filter-pills" aria-label="Filter preview">
              {activeProfileSignals.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
          ) : (
            <div className="toolbar-actions">
              <p>Open a care profile from the employer workspace to see match percentages.</p>
              <Link className="button-secondary" to="/">
                Choose a care profile
              </Link>
            </div>
          )}
        </div>

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
                        <p className="panel-label">
                          {index === 0 ? "Top fit" : "Detailed preview"}
                        </p>
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
                  <div>
                    <p className="panel-label">More ranked results</p>
                    <h2>Continue in compact gallery view</h2>
                  </div>
                </div>

                <div className="gallery-grid" aria-label="More ranked caregivers">
                  {remainingResults.map((caregiver, index) => (
                    <Link
                      className="caregiver-card caregiver-card-link caregiver-card-compact"
                      key={caregiver.id}
                      to={getCaregiverDetailHref(caregiver.id, activeProfile?.id)}
                    >
                      <div className="portrait-block">
                        <div className="portrait-frame">
                          <span>{caregiver.name.charAt(0)}</span>
                        </div>
                        {caregiver.matchPercent !== null ? (
                          <span className="score-token">{caregiver.matchPercent}% match</span>
                        ) : null}
                      </div>

                      <div className="caregiver-card-copy">
                        <div>
                          <p className="panel-label">Rank #{index + 4}</p>
                          <h2>{caregiver.name}</h2>
                          <p className="agency-line">{caregiver.agency}</p>
                        </div>

                        <div className="trait-chips">
                          {caregiver.traits.map((trait) => (
                            <span className="trait-chip" key={trait}>
                              {trait}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="gallery-grid" aria-label="Caregiver search results">
            {remainingResults.map((caregiver) => (
              <Link
                className="caregiver-card caregiver-card-link"
                key={caregiver.id}
                to={getCaregiverDetailHref(caregiver.id)}
              >
                <div className="portrait-block">
                  <div className="portrait-frame">
                    <span>{caregiver.name.charAt(0)}</span>
                  </div>
                </div>

                <div className="caregiver-card-copy">
                  <div>
                    <p className="panel-label">Caregiver profile</p>
                    <h2>{caregiver.name}</h2>
                    <p className="agency-line">{caregiver.agency}</p>
                  </div>

                  <p className="result-summary">{caregiver.summary}</p>

                  <div className="trait-chips">
                    {caregiver.traits.map((trait) => (
                      <span className="trait-chip" key={trait}>
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <aside className="result-sidebar">
          <p className="panel-label">{isMatchedMode ? "Matched mode" : "Browse mode"}</p>
          <p>
            {isMatchedMode
              ? "This state is activated by opening search from a specific care profile. The ranking is weighted, explainable, and intentionally practical rather than clinical."
              : "This generic browse state keeps search accessible from navigation without pretending a profile has already been selected."}
          </p>
          {isMatchedMode ? (
            <div className="score-weight-list" aria-label="Scoring weights">
              <div className="score-weight-row">
                <span>Language</span>
                <strong>32</strong>
              </div>
              <div className="score-weight-row">
                <span>Conditions</span>
                <strong>22</strong>
              </div>
              <div className="score-weight-row">
                <span>Daily care tasks</span>
                <strong>18</strong>
              </div>
              <div className="score-weight-row">
                <span>Mobility support</span>
                <strong>12</strong>
              </div>
              <div className="score-weight-row">
                <span>Medication support</span>
                <strong>10</strong>
              </div>
              <div className="score-weight-row">
                <span>Experience</span>
                <strong>6</strong>
              </div>
            </div>
          ) : null}
          <Link className="button-secondary" to="/">
            Return to employer profile
          </Link>
        </aside>
      </section>
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
