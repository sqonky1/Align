import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import { PageHeader } from "../components/layout/PageHeader"
import {
  createAgencyHandoffRequest,
  formatDisplayLabel,
  getAgencies,
  getLatestAgencyHandoffForProfile,
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
  const agencies = getAgencies()
  const latestHandoff = getLatestAgencyHandoffForProfile(profile.id)
  const [isHandoffOpen, setIsHandoffOpen] = useState(false)
  const [handoffAgencyId, setHandoffAgencyId] = useState(agencies[0]?.id ?? "")
  const [handoffNote, setHandoffNote] = useState("")
  const [handoffReceipt, setHandoffReceipt] = useState(latestHandoff)
  const matchedCaregivers = getRankedCaregiverGalleryData(profile)
  const suggestedCaregivers = matchedCaregivers
    .filter((caregiver) => !savedCaregivers.some((saved) => saved.caregiverId === caregiver.id))
    .slice(0, 3)
  const handoffAgency =
    agencies.find((agency) => agency.id === handoffReceipt?.agencyId) ?? null

  function handleHandoffSubmit() {
    if (savedCaregivers.length === 0 || handoffAgencyId.length === 0) {
      return
    }

    const nextRequest = createAgencyHandoffRequest({
      careProfileId: profile!.id,
      agencyId: handoffAgencyId,
      caregiverIds: savedCaregivers.map((entry) => entry.caregiverId),
      note: handoffNote,
    })

    setHandoffReceipt(nextRequest)
    setIsHandoffOpen(false)
    setHandoffNote("")
  }

  return (
    <section className="page-section">
      <div className="detail-backnav">
        <button className="button-secondary" onClick={() => navigate(-1)} type="button">
          Back
        </button>
      </div>

      <PageHeader
        eyebrow="Care recipient detail"
        title={`Review ${profile.name}'s care brief.`}
        description="This page consolidates the care recipient's structured needs, household context, notes, and shortlist progress in one place."
      />

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
                <h2>Saved caregivers for {profile.name}</h2>
              </div>
            </div>

            {savedCaregivers.length > 0 ? (
              <>
                <div className="saved-gallery" aria-label={`${profile.name} saved caregivers`}>
                  {savedCaregivers.map((caregiver) => (
                    <CaregiverCard
                      agency={caregiver.agency}
                      href={`/caregivers/${caregiver.caregiverId}?profile=${profile.id}`}
                      key={caregiver.id}
                      name={caregiver.name}
                      secondaryText="Saved caregiver"
                      summary={caregiver.summary}
                      traits={caregiver.traits}
                    />
                  ))}
                </div>

                <article className="detail-meta-card handoff-card">
                  <div className="detail-meta-card-header">
                    <div>
                      <p className="panel-label">Agency handoff</p>
                      <h3>Share shortlist with a partner agency</h3>
                    </div>
                    <button
                      className="button-primary"
                      onClick={() => setIsHandoffOpen(true)}
                      type="button"
                    >
                      Start handoff
                    </button>
                  </div>
                  <p className="detail-supporting-copy">
                    Simulate website handoff for hiring and placement based on this shortlist.
                  </p>
                  {handoffReceipt && handoffAgency ? (
                    <p className="handoff-receipt">
                      Last handoff sent to {handoffAgency.name} on{" "}
                      {new Date(handoffReceipt.submittedAt).toLocaleString()}.
                    </p>
                  ) : null}
                </article>
              </>
            ) : (
              <div className="detail-meta-card">
                <p className="detail-supporting-copy">
                  No caregivers have been saved for this care recipient yet.
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
                <h2>Top suggested caregivers</h2>
              </div>
            </div>

            <div className="saved-gallery" aria-label={`${profile.name} suggested caregivers`}>
              {suggestedCaregivers.map((caregiver, index) => (
                <CaregiverCard
                  agency={caregiver.agency}
                  compact
                  cornerText={`#${index + 1} match`}
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

      {isHandoffOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setIsHandoffOpen(false)}
          role="dialog"
        >
          <div className="modal-panel handoff-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-header section-header-tight modal-header">
              <div>
                <h2>Agency handoff simulation</h2>
                <p className="toolbar-caption">
                  Send {savedCaregivers.length} shortlisted caregivers for {profile.name}.
                </p>
              </div>
              <button
                aria-label="Close handoff simulation"
                className="modal-close"
                onClick={() => setIsHandoffOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="handoff-agency-grid">
              {agencies.map((agency) => (
                <button
                  className={`handoff-agency-option ${agency.id === handoffAgencyId ? "handoff-agency-option-active" : ""}`}
                  key={agency.id}
                  onClick={() => setHandoffAgencyId(agency.id)}
                  type="button"
                >
                  <h3>{agency.name}</h3>
                  <p>{agency.location}</p>
                </button>
              ))}
            </div>

            <label className="form-field">
              <span>Agency note (optional)</span>
              <textarea
                onChange={(event) => setHandoffNote(event.target.value)}
                placeholder="Any details to include for coordinator callback and interview scheduling."
                value={handoffNote}
              />
            </label>

            <div className="handoff-modal-actions">
              <button className="button-secondary" onClick={() => setIsHandoffOpen(false)} type="button">
                Cancel
              </button>
              <button className="button-primary" onClick={handleHandoffSubmit} type="button">
                Send handoff
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
