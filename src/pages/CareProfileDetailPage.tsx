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
      icon: "conditions" as const,
      values: profile.conditions.map(formatDisplayLabel),
      emptyLabel: "No conditions added",
    },
    {
      title: "Daily care tasks",
      icon: "tasks" as const,
      values: profile.dailyCareTasks.map(formatDisplayLabel),
      emptyLabel: "No daily care tasks added",
    },
    {
      title: "Mobility support",
      icon: "mobility" as const,
      values: profile.mobilitySupport.map(formatDisplayLabel),
      emptyLabel: "No mobility needs added",
    },
    {
      title: "Medication support",
      icon: "medication" as const,
      values: profile.medicationSupport.map(formatDisplayLabel),
      emptyLabel: "No medication support added",
    },
    {
      title: "Household context",
      icon: "household" as const,
      values: profile.householdContext.map(formatDisplayLabel),
      emptyLabel: "No household context added",
    },
  ]
  const coreProfileStats = [
    { label: "Age", value: String(profile.age) },
    { label: "Gender", value: formatDisplayLabel(profile.gender) },
    {
      label: "Preferred language",
      value: profile.preferredLanguage,
      className: "detail-core-stat-wide",
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
            contextLabel=""
            interactive={false}
            profile={profile}
            showActions
            variant="anchor"
          />

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <h2 className="care-profile-section-title">Care brief</h2>
              </div>
            </div>

            <div className="detail-meta-master" aria-label="Care recipient overview">
              <article className="detail-meta-tile detail-meta-tile-core">
                <div className="detail-meta-section-header">
                  <div className="detail-meta-heading-row">
                    <SectionIcon type="profile" />
                    <p className="panel-label">Core profile</p>
                  </div>
                </div>
                <div className="detail-core-stat-grid" aria-label="Core profile data">
                  {coreProfileStats.map((item) => (
                    <div
                      className={`detail-core-stat ${item.className ?? ""}`.trim()}
                      key={item.label}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              {overviewSections.map((section) => (
                <article className="detail-meta-tile" key={section.title}>
                  <div className="detail-meta-section-header">
                    <div className="detail-meta-heading-row">
                      <SectionIcon type={section.icon} />
                      <p className="panel-label">{section.title}</p>
                    </div>
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
                <h2 className="care-profile-section-title">Additional Context</h2>
              </div>
            </div>

            <div className="detail-meta-grid">
              <article className="detail-meta-card">
                <p className="detail-meta-card-title">Risk notes</p>
                <p className="detail-supporting-copy">
                  {profile.riskNotes || "No risk notes added"}
                </p>
              </article>
              <article className="detail-meta-card">
                <p className="detail-meta-card-title">Additional notes</p>
                <p className="detail-supporting-copy">
                  {profile.additionalNotes || "No additional notes added"}
                </p>
              </article>
            </div>
          </section>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <h2 className="care-profile-section-title">Shortlisted Caregivers</h2>
              </div>
            </div>

            {savedCaregivers.length > 0 ? (
              <>
                <div className="matched-gallery-grid" aria-label={`${profile.name} shortlisted caregivers`}>
                  {savedCaregivers.map((caregiver) => (
                    <CaregiverCard
                      agencyId={caregiver.agencyId}
                      agency={caregiver.agency}
                      className="matched-gallery-card"
                      href={`/caregivers/${caregiver.caregiverId}?profile=${profile.id}`}
                      key={caregiver.id}
                      matchPercent={caregiver.matchPercent}
                      name={caregiver.name}
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
                <h2 className="care-profile-section-title">Suggested for {profile.name}</h2>
              </div>
            </div>

            <div className="matched-gallery-grid" aria-label={`${profile.name} suggested caregivers`}>
              {suggestedCaregivers.map((caregiver) => (
                <CaregiverCard
                  agencyId={caregiver.agencyId}
                  agency={caregiver.agency}
                  className="matched-gallery-card"
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

function SectionIcon({
  type,
}: {
  type: "profile" | "conditions" | "tasks" | "mobility" | "medication" | "household"
}) {
  if (type === "conditions") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M12 21s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.6-7 10-7 10z" />
      </svg>
    )
  }

  if (type === "tasks") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4M7 4h10l3 3v13H4V4h3z" />
      </svg>
    )
  }

  if (type === "mobility") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M13 6a2 2 0 11-4 0 2 2 0 014 0zM10 9l3 2v3l3 3M10 11l-2 4-3 2m5-3h4" />
      </svg>
    )
  }

  if (type === "medication") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M8 4h8v6H8zM12 10v10m-4-6h8" />
      </svg>
    )
  }

  if (type === "household") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M4 11l8-6 8 6M7 10v8h10v-8M10 18v-4h4v4" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
      <path d="M12 3l8 4v5c0 4.9-3.2 8.3-8 9.8-4.8-1.5-8-4.9-8-9.8V7l8-4zm0 5v8m-4-4h8" />
    </svg>
  )
}
