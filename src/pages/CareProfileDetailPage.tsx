import { Link, useNavigate, useParams } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"
import { formatDisplayLabel, getCareProfileById } from "../lib/data"

export function CareProfileDetailPage() {
  const { profileId } = useParams()
  const navigate = useNavigate()
  const profile = profileId ? getCareProfileById(profileId) : null

  if (!profile) {
    return (
      <section className="page-section">
        <div className="editor-canvas empty-editor-state">
          <h2>Care profile not found.</h2>
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
    },
    {
      title: "Daily care tasks",
      values: profile.dailyCareTasks.map(formatDisplayLabel),
      emptyLabel: "No daily care tasks added",
    },
    {
      title: "Mobility support",
      values: profile.mobilitySupport.map(formatDisplayLabel),
      emptyLabel: "No mobility needs added",
    },
    {
      title: "Medication support",
      values: profile.medicationSupport.map(formatDisplayLabel),
      emptyLabel: "No medication support added",
    },
    {
      title: "Household context",
      values: profile.householdContext.map(formatDisplayLabel),
      emptyLabel: "No household context added",
    },
  ]

  return (
    <section className="page-section">
      <div className="detail-backnav">
        <button className="button-secondary" onClick={() => navigate(-1)} type="button">
          Back
        </button>
      </div>

      <PageHeader
        title={profile.name}
        description={`${profile.age} years old · ${formatDisplayLabel(profile.gender)} · ${profile.preferredLanguage}`}
      />

      <section className="detail-stage">
        <div className="detail-main">
          <section className="profile-detail-hero">
            <div className="profile-card-top">
              <span className="profile-glyph" aria-hidden="true">
                {profile.name.charAt(0)}
              </span>

              <div className="profile-card-actions-stack">
                <Link className="profile-card-action" to={`/profiles/${profile.id}/edit`}>
                  Edit profile
                </Link>
                <Link className="profile-card-action" to={`/search?profile=${profile.id}`}>
                  Find a match
                </Link>
              </div>
            </div>

            <div className="profile-detail-overview">
              <div className="profile-card-stat-grid" aria-label={`${profile.name} profile overview`}>
                <div className="profile-card-stat">
                  <span>Conditions</span>
                  <strong>{profile.conditions.length}</strong>
                </div>
                <div className="profile-card-stat">
                  <span>Daily care</span>
                  <strong>{profile.dailyCareTasks.length}</strong>
                </div>
                <div className="profile-card-stat">
                  <span>Mobility</span>
                  <strong>{profile.mobilitySupport.length}</strong>
                </div>
                <div className="profile-card-stat">
                  <span>Medication</span>
                  <strong>{profile.medicationSupport.length}</strong>
                </div>
                <div className="profile-card-stat">
                  <span>Household</span>
                  <strong>{profile.householdContext.length}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <h2>Care overview</h2>
            </div>

            <div className="detail-meta-grid" aria-label="Care profile overview">
              {overviewSections.map((section) => (
                <article className="detail-meta-card" key={section.title}>
                  <p className="panel-label">{section.title}</p>
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
              <h2>Notes</h2>
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
        </div>
      </section>
    </section>
  )
}
