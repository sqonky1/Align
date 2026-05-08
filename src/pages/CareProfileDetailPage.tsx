import { Link, useNavigate, useParams } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import {
  formatDisplayLabel,
  getCareProfileById,
  getRankedCaregiverGalleryData,
  getSavedCaregiverGalleryDataForProfile,
} from "../lib/data"
import { getMatchSearchHref } from "../lib/matchNavigation"

export function CareProfileDetailPage() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const profile = profileId ? getCareProfileById(profileId) : null

  if (!profile) {
    return (
      <section className="page-section">
        <div className="editor-canvas empty-editor-state">
          <p className="panel-label">Care recipient detail</p>
          <h2>Care recipient not found.</h2>
          <p>The selected profile is missing from the current workspace.</p>
          <Link className="button-primary" to="/">
            Return to workspace
          </Link>
        </div>
      </section>
    )
  }

  const overviewSections = [
    {
      title: "Conditions",
      values: profile.conditions.map(formatDisplayLabel),
      emptyLabel: "No conditions added",
      count: profile.conditions.length,
    },
    {
      title: "Daily care tasks",
      values: profile.dailyCareTasks.map(formatDisplayLabel),
      emptyLabel: "No daily care tasks added",
      count: profile.dailyCareTasks.length,
    },
    {
      title: "Mobility support",
      values: profile.mobilitySupport.map(formatDisplayLabel),
      emptyLabel: "No mobility needs added",
      count: profile.mobilitySupport.length,
    },
    {
      title: "Medication support",
      values: profile.medicationSupport.map(formatDisplayLabel),
      emptyLabel: "No medication support added",
      count: profile.medicationSupport.length,
    },
    {
      title: "Household context",
      values: profile.householdContext.map(formatDisplayLabel),
      emptyLabel: "No household context added",
      count: profile.householdContext.length,
    },
  ]

  const savedCaregivers = getSavedCaregiverGalleryDataForProfile(profile.id)
  const matchedCaregivers = getRankedCaregiverGalleryData(profile)
  const suggestedCaregivers = matchedCaregivers
    .filter((caregiver) => !savedCaregivers.some((saved) => saved.caregiverId === caregiver.id))
    .slice(0, 3)

  return (
    <section className="page-section">
      <div className="detail-backnav">
        <button className="button-secondary" onClick={() => navigate(-1)} type="button">
          Back
        </button>
      </div>

      <section className="detail-stage">
        <div className="detail-main">
          <CareProfileCard
            className="detail-profile-card"
            contextLabel="Active care recipient"
            interactive={false}
            profile={profile}
            showActions
            variant="anchor"
          />

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Care brief</p>
                <h2>Structured needs overview</h2>
              </div>
            </div>

            <div className="detail-meta-grid" aria-label="Care recipient overview">
              <article className="detail-meta-card">
                <p className="panel-label">Core profile</p>
                <div className="detail-list">
                  <div className="signal-row">
                    <span>Age</span>
                    <strong>{profile.age}</strong>
                  </div>
                  <div className="signal-row">
                    <span>Gender</span>
                    <strong>{formatDisplayLabel(profile.gender)}</strong>
                  </div>
                  <div className="signal-row">
                    <span>Preferred language</span>
                    <strong>{profile.preferredLanguage}</strong>
                  </div>
                </div>
              </article>

              {overviewSections.map((section) => (
                <article className="detail-meta-card" key={section.title}>
                  <div className="detail-meta-card-header">
                    <p className="panel-label">{section.title}</p>
                    <strong className="detail-meta-card-count">{section.count}</strong>
                  </div>
                  {section.values.length > 0 ? (
                    <div className="trait-chips">
                      {section.values.map((value) => (
                        <span className="trait-chip" key={value}>
                          {value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="detail-empty-copy">{section.emptyLabel}</p>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Notes</p>
                <h2>Context for matching and handoff</h2>
              </div>
            </div>

            <div className="detail-meta-grid">
              <article className="detail-meta-card">
                <p className="panel-label">Risk notes</p>
                <p className="detail-supporting-copy">
                  {profile.riskNotes || "No risk notes added"}
                </p>
              </article>
              <article className="detail-meta-card">
                <p className="panel-label">Additional notes</p>
                <p className="detail-supporting-copy">
                  {profile.additionalNotes || "No additional notes added"}
                </p>
              </article>
            </div>
          </section>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Shortlist</p>
                <h2>Shortlisted caregivers for {profile.name}</h2>
              </div>
            </div>

            {savedCaregivers.length > 0 ? (
              <>
                <div className="matched-gallery-grid" aria-label={`${profile.name} shortlisted caregivers`}>
                  {savedCaregivers.map((caregiver) => (
                    <CaregiverCard
                      agency={caregiver.agency}
                      compact
                      href={`/caregivers/${caregiver.caregiverId}?profile=${profile.id}`}
                      key={caregiver.id}
                      name={caregiver.name}
                      secondaryText="Shortlisted caregiver"
                      summary={caregiver.summary}
                      traits={caregiver.traits}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="detail-meta-card">
                <p className="detail-supporting-copy">
                  No caregivers have been shortlisted for this care recipient yet.
                </p>
                <div>
                  <Link className="button-primary" to={getMatchSearchHref(profile.id)}>
                    Start matching
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Next options</p>
                <h2>Suggested for {profile.name}</h2>
              </div>
            </div>

            <div className="matched-gallery-grid" aria-label={`${profile.name} suggested caregivers`}>
              {suggestedCaregivers.map((caregiver) => (
                <CaregiverCard
                  agency={caregiver.agency}
                  compact
                  href={`/caregivers/${caregiver.id}?profile=${profile.id}`}
                  key={caregiver.id}
                  matchPercent={caregiver.matchPercent}
                  name={caregiver.name}
                  summary={caregiver.summary}
                  traits={caregiver.traits}
                />
              ))}
            </div>
          </section>
        </div>
      </section>
    </section>
  )
}
