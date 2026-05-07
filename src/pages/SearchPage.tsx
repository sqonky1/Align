import { Link, useSearchParams } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"
import {
  formatDisplayLabel,
  getBrowseCaregiverGalleryData,
  getCareProfileById,
  getRankedCaregiverGalleryData,
} from "../lib/data"

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const activeProfileId = searchParams.get("profile")
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
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

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Search"
        title={
          activeProfile
            ? "Rank caregivers against the active care profile."
            : "Browse caregivers, then apply a care profile for tailored matching."
        }
        description={
          activeProfile
            ? "Results are now scored from structured profile fields only, with language weighted heavily and practical care-fit overlap driving the ranking."
            : "Browse mode stays neutral. It shows the full caregiver dataset without pretending a profile-specific match score exists."
        }
      />

      <section className="search-stage">
        <div className="search-toolbar">
          <div>
            <p className="panel-label">
              {activeProfile ? "Active profile" : "Browse mode"}
            </p>
            <h2>{activeProfile ? activeProfile.name : "No care profile selected"}</h2>
            <p className="toolbar-caption">
              {activeProfile
                ? `${searchResults.length} caregivers ranked by structured fit`
                : `${searchResults.length} caregivers available to browse`}
            </p>
          </div>
          {activeProfile ? (
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

        <div className="gallery-grid" aria-label="Caregiver search results">
          {searchResults.map((caregiver, index) => (
            <article className="caregiver-card" key={caregiver.id}>
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
                  <p className="panel-label">
                    {activeProfile
                      ? index === 0
                        ? "Top fit"
                        : "Relevant fit"
                      : "Caregiver profile"}
                  </p>
                  <h2>{caregiver.name}</h2>
                  <p className="agency-line">{caregiver.agency}</p>
                </div>

                <p className="result-summary">{caregiver.summary}</p>
                {caregiver.alert ? <p className="fit-alert">{caregiver.alert}</p> : null}

                <div className="trait-chips">
                  {caregiver.traits.map((trait) => (
                    <span className="trait-chip" key={trait}>
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="result-sidebar">
          <p className="panel-label">{activeProfile ? "Matched mode" : "Browse mode"}</p>
          <p>
            {activeProfile
              ? "This state is activated by opening search from a specific care profile. Scores are weighted, explainable, and grounded in language fit, care overlap, and experience."
              : "This generic browse state keeps search accessible from navigation without pretending a profile has already been selected."}
          </p>
          <Link className="button-secondary" to="/">
            Return to employer profile
          </Link>
        </aside>
      </section>
    </section>
  )
}
