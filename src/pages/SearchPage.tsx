import { Link, useSearchParams } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"
import {
  formatDisplayLabel,
  getBrowseCaregiverGalleryData,
  getCareProfileById,
  getSearchPreviewData,
} from "../lib/data"

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const activeProfileId = searchParams.get("profile")
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
  const previewCaregivers = activeProfile
    ? getSearchPreviewData()
    : getBrowseCaregiverGalleryData()

  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Search"
        title={
          activeProfile
            ? "Search caregivers through the lens of a care profile."
            : "Browse caregivers, then apply a care profile for tailored matching."
        }
        description={
          activeProfile
            ? "This route is ready for ranked results, applied filters, and practical fit reasoning once the matching engine lands."
            : "Search can stand alone as a discovery surface, but profile-based matching is where Align becomes meaningfully specific."
        }
      />

      <section className="search-stage">
        <div className="search-toolbar">
          <div>
            <p className="panel-label">
              {activeProfile ? "Active profile" : "Browse mode"}
            </p>
            <h2>{activeProfile ? activeProfile.name : "No care profile selected"}</h2>
          </div>
          {activeProfile ? (
            <div className="filter-pills" aria-label="Filter preview">
              <span>{activeProfile.preferredLanguage}</span>
              <span>{formatDisplayLabel(activeProfile.conditions[0])}</span>
              <span>{formatDisplayLabel(activeProfile.mobilitySupport[0])}</span>
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

        <div className="gallery-grid" aria-label="Caregiver search preview">
          {previewCaregivers.map((caregiver, index) => (
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
              ? "This state is activated by opening search from a specific care profile. It will carry the profile context into ranking and rationale."
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
