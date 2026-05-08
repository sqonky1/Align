import { useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import {
  formatDisplayLabel,
  getCaregiverById,
  getCaregivers,
  getCareProfileById,
  isCaregiverSavedForProfile,
  removeSavedCaregiverForProfile,
  saveCaregiverForProfile,
} from "../lib/data"
import {
  getCaregiverLanguageDisplay,
  getRankedCaregiverMatches,
  scoreCaregiverMatch,
  type MatchDimensionResult,
} from "../lib/matching"
import { buildCaregiverSnapshotPills } from "../lib/caregiverPills"
import { getRankAccentClass } from "../lib/rankAccents"

export function CaregiverDetailPage() {
  const { caregiverId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeProfileId = searchParams.get("profile")
  const caregiver = caregiverId ? getCaregiverById(caregiverId) : null
  const activeProfile = activeProfileId ? getCareProfileById(activeProfileId) : null
  const rankedMatches = activeProfile ? getRankedCaregiverMatches(activeProfile, getCaregivers()) : []
  const rankedMatchIndex =
    caregiver && activeProfile
      ? rankedMatches.findIndex((entry) => entry.caregiver.id === caregiver.id)
      : -1
  const matchResult =
    caregiver && activeProfile
      ? rankedMatches[rankedMatchIndex] ??
        scoreCaregiverMatch(activeProfile, caregiver)
      : null
  const matchRank = rankedMatchIndex >= 0 ? rankedMatchIndex + 1 : null
  const isMatchedMode = Boolean(caregiver && activeProfile && matchResult)
  const activeRankClass =
    matchRank && matchRank <= 3 ? getRankAccentClass(matchRank - 1) : undefined
  const [isHandoffConfirmOpen, setIsHandoffConfirmOpen] = useState(false)
  const [isHandoffSimulationOpen, setIsHandoffSimulationOpen] = useState(false)
  const [savedFlag, setSavedFlag] = useState(
    caregiver && activeProfileId
      ? isCaregiverSavedForProfile(activeProfileId, caregiver.id)
      : false,
  )

  useEffect(() => {
    if (!caregiver || !activeProfileId) {
      setSavedFlag(false)
      return
    }

    setSavedFlag(isCaregiverSavedForProfile(activeProfileId, caregiver.id))
  }, [activeProfileId, caregiver])

  function handleToggleSave() {
    if (!caregiver || !activeProfileId) {
      return
    }

    if (savedFlag) {
      removeSavedCaregiverForProfile(activeProfileId, caregiver.id)
      setSavedFlag(false)
      return
    }

    saveCaregiverForProfile(activeProfileId, caregiver.id)
    setSavedFlag(true)
  }

  if (!caregiver) {
    return (
      <section className="page-section">
        <div className="editor-canvas empty-editor-state">
          <p className="panel-label">Caregiver detail</p>
          <h2>Caregiver not found.</h2>
          <p>The selected caregiver record is missing from the current mock dataset.</p>
          <Link className="button-primary" to="/search">
            Return to search
          </Link>
        </div>
      </section>
    )
  }

  const capabilitySections = [
    {
      title: "Languages",
      icon: "language" as const,
      values: caregiver.languages,
    },
    {
      title: "Care conditions",
      icon: "conditions" as const,
      values: caregiver.careConditions.map(formatDisplayLabel),
    },
    {
      title: "Daily care tasks",
      icon: "tasks" as const,
      values: caregiver.careTasks.map(formatDisplayLabel),
    },
    {
      title: "Mobility support",
      icon: "mobility" as const,
      values: caregiver.mobilitySkills.map(formatDisplayLabel),
    },
    {
      title: "Medication support",
      icon: "medication" as const,
      values: caregiver.medicationSkills.map(formatDisplayLabel),
    },
    {
      title: "Training",
      icon: "training" as const,
      values: caregiver.training,
    },
    {
      title: "Certifications",
      icon: "certifications" as const,
      values: caregiver.certifications,
      emptyLabel: "No certification listed",
    },
  ]
  const browseSnapshotPills = [
    { label: caregiver.nationality, tone: "partial" as const },
    { label: formatDisplayLabel(caregiver.gender), tone: "partial" as const },
    ...buildCaregiverSnapshotPills(caregiver),
  ]
  const coreProfileStats = [
    { label: "Age", value: String(caregiver.age) },
    { label: "Gender", value: formatDisplayLabel(caregiver.gender) },
    { label: "Nationality", value: caregiver.nationality },
    { label: "Experience", value: `${caregiver.yearsOfExperience} years` },
  ]

  return (
    <section className="page-section caregiver-detail-page">
      <div className="detail-top-actions">
        <button className="button-secondary" onClick={() => navigate(-1)} type="button">
          Back to search
        </button>
        <button
          className="button-primary detail-handoff-button"
          onClick={() => setIsHandoffConfirmOpen(true)}
          type="button"
        >
          Agency handoff
        </button>
      </div>

      <section className="detail-stage">
        <div className="detail-main">
          <div className="detail-primary-stack">
            <div className="detail-context-row">
              {isMatchedMode && activeProfile ? (
                <CareProfileCard
                  className="detail-profile-context-card"
                  contextLabel="Reviewing for"
                  href={`/profiles/${activeProfile.id}`}
                  profile={{
                    id: activeProfile.id,
                    name: activeProfile.name,
                    age: activeProfile.age,
                    gender: activeProfile.gender,
                    preferredLanguage: activeProfile.preferredLanguage,
                  }}
                  showActions={false}
                  variant="anchor"
                />
              ) : null}
            </div>

            <section
              className={`caregiver-card caregiver-card-ranked detail-hero ${
                activeRankClass ?? ""
              }`.trim()}
            >
              <div className="detail-hero-body">
                <div className="detail-portrait">
                  <div className="portrait-frame">
                    <span>{caregiver.name.charAt(0)}</span>
                  </div>
                </div>

                <div className="caregiver-card-copy detail-hero-content">
                  <div className="detail-hero-header">
                    <div className="detail-hero-heading">
                      <div>
                        <p className="panel-label">
                          {isMatchedMode ? "Matched caregiver" : "Caregiver profile"}
                        </p>
                        <div className="detail-hero-name-row">
                          <h2>{caregiver.name}</h2>
                          {isMatchedMode && matchRank ? (
                            <span className="rank-token detail-hero-rank-token">#{matchRank}</span>
                          ) : null}
                        </div>
                        <p className="agency-line">{caregiver.agencyName}</p>
                      </div>
                    </div>

                    {isMatchedMode && matchResult ? (
                      <div className="detail-hero-actions">
                        <span className="score-token">{matchResult.matchPercent}% match</span>
                        <button
                          className={`button-secondary shortlist-toggle ${savedFlag ? "shortlist-toggle-active" : ""}`}
                          onClick={handleToggleSave}
                          type="button"
                        >
                          {savedFlag ? "Saved to shortlist" : "Save to shortlist"}
                        </button>
                      </div>
                    ) : (
                      <span className="detail-status-chip">
                        {caregiver.availability === "available" ? "Available now" : "Shortlist only"}
                      </span>
                    )}
                  </div>

                  <p className="result-summary">{caregiver.bio}</p>

                  {isMatchedMode && matchResult ? (
                    <>
                      <p className="detail-supporting-copy">{matchResult.summary}</p>
                      {matchResult.alert ? <p className="fit-alert">{matchResult.alert}</p> : null}
                      <div className="breakdown-chip-list" aria-label={`${caregiver.name} fit summary`}>
                        {matchResult.breakdown
                          .filter((item) => item.maxScore > 0)
                          .map((item) => (
                            <span
                              className={`breakdown-chip ${getBreakdownStatusClass(item)}`}
                              key={item.key}
                            >
                              {item.label}: {getBreakdownChipCopy(item, caregiver.languages, activeProfile?.preferredLanguage)}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="breakdown-chip-list" aria-label="Caregiver snapshot">
                      {browseSnapshotPills.map((item) => (
                        <span className={`breakdown-chip breakdown-chip-${item.tone}`} key={item.label}>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Profile snapshot</p>
                <h2>Practical overview</h2>
              </div>
            </div>

            <div className="detail-meta-master" aria-label="Caregiver overview">
              <article className="detail-meta-tile detail-meta-tile-core">
                <div className="detail-meta-section-header">
                  <div className="detail-meta-heading-row">
                    <SectionIcon type="profile" />
                    <p className="panel-label">Core profile</p>
                  </div>
                </div>
                <div className="detail-core-stat-grid" aria-label="Core profile data">
                  {coreProfileStats.map((item) => (
                    <div className="detail-core-stat" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              {capabilitySections.map((section) => (
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
                    <p className="detail-empty-copy">
                      {section.emptyLabel ?? "No structured items listed"}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>

          {isMatchedMode && matchResult && activeProfile ? (
            <section className="section-shell">
              <div className="section-header section-header-tight">
                <div>
                  <p className="panel-label">Fit breakdown</p>
                  <h2>How this caregiver lines up with {activeProfile.name}</h2>
                </div>
              </div>

              <div className="detail-fit-grid" aria-label="Detailed fit breakdown">
                {matchResult.breakdown
                  .filter((item) => item.maxScore > 0)
                  .map((item) => (
                    <article
                      className={`detail-fit-card ${getDetailFitCardClass(item)}`}
                      key={item.key}
                    >
                      <div className="detail-fit-card-header">
                        <div>
                          <p className="panel-label">{item.label}</p>
                          <h3>{getDetailFitHeading(item)}</h3>
                        </div>
                        <span className={`breakdown-chip ${getBreakdownStatusClass(item)}`}>
                          {Math.round((item.score / item.maxScore) * 100)}%
                        </span>
                      </div>

                      <p className="detail-supporting-copy">{getDetailFitSummary(item)}</p>

                      <div className="detail-fit-lists">
                        {getDetailListGroups(item).map((group) => (
                          <div className="detail-fit-list" key={group.label}>
                            <span>{group.label}</span>
                            {group.values.length > 0 ? (
                              <div className="trait-chips">
                                {group.values.map((value) => (
                                  <span className="trait-chip" key={value}>
                                    {value}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="detail-empty-copy">{group.emptyLabel}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      {isHandoffConfirmOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setIsHandoffConfirmOpen(false)}
          role="dialog"
        >
          <div className="modal-panel handoff-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-header section-header-tight modal-header">
              <div>
                <h2>Confirm agency handoff</h2>
                <p className="detail-supporting-copy">
                  Inquire handoff details for {caregiver.name} on agency page?
                </p>
              </div>
              <button
                aria-label="Close handoff confirmation"
                className="modal-close"
                onClick={() => setIsHandoffConfirmOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="handoff-modal-actions">
              <button
                className="button-secondary"
                onClick={() => setIsHandoffConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button-primary"
                onClick={() => {
                  setIsHandoffConfirmOpen(false)
                  setIsHandoffSimulationOpen(true)
                }}
                type="button"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isHandoffSimulationOpen ? (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setIsHandoffSimulationOpen(false)}
          role="dialog"
        >
          <div className="modal-panel handoff-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-header section-header-tight modal-header">
              <div>
                <h2>Simulation notice</h2>
                <p className="detail-supporting-copy">
                  This is a simulation. In the real product, you will be redirected to the actual agency page.
                </p>
              </div>
              <button
                aria-label="Close simulation notice"
                className="modal-close"
                onClick={() => setIsHandoffSimulationOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="handoff-modal-actions">
              <button
                className="button-primary"
                onClick={() => setIsHandoffSimulationOpen(false)}
                type="button"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SectionIcon({
  type,
}: {
  type:
    | "profile"
    | "language"
    | "conditions"
    | "tasks"
    | "mobility"
    | "medication"
    | "training"
    | "certifications"
}) {
  if (type === "language") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c2.6 2.7 4 6.3 4 10s-1.4 7.3-4 10m0-20C9.4 4.7 8 8.3 8 12s1.4 7.3 4 10M3 12h18M4.7 7h14.6M4.7 17h14.6" />
      </svg>
    )
  }

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

  if (type === "training") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M3 9l9-4 9 4-9 4-9-4zm3 2.3V16l6 3 6-3v-4.7" />
      </svg>
    )
  }

  if (type === "certifications") {
    return (
      <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
        <path d="M12 3l7 4v6c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V7l7-4zm-3 9l2 2 4-4" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="detail-meta-icon" viewBox="0 0 24 24">
      <path d="M12 3l8 4v5c0 4.9-3.2 8.3-8 9.8-4.8-1.5-8-4.9-8-9.8V7l8-4zm0 5v8m-4-4h8" />
    </svg>
  )
}

function getBreakdownStatusClass(item: MatchDimensionResult) {
  if (item.maxScore > 0 && item.score === item.maxScore) {
    return "breakdown-chip-strong"
  }

  if (item.score === 0) {
    return "breakdown-chip-gap"
  }

  return "breakdown-chip-partial"
}

function getDetailFitCardClass(item: MatchDimensionResult) {
  if (item.maxScore > 0 && item.score === item.maxScore) {
    return "detail-fit-card-strong"
  }

  if (item.score === 0) {
    return "detail-fit-card-gap"
  }

  return "detail-fit-card-partial"
}

function getBreakdownChipCopy(
  item: MatchDimensionResult,
  caregiverLanguages: string[],
  preferredLanguage?: string,
) {
  if (item.key === "language") {
    return getCaregiverLanguageDisplay(caregiverLanguages, preferredLanguage)
  }

  if (item.key === "experience") {
    return item.matchedValues[0] ?? "Experience not available"
  }

  const requestedCount = item.matchedValues.length + item.missingValues.length
  return `${item.matchedValues.length}/${requestedCount}`
}

function getDetailFitHeading(item: MatchDimensionResult) {
  if (item.key === "language") {
    return item.matchedValues.length > 0 ? "Communication fit is covered" : "Language mismatch"
  }

  if (item.key === "experience") {
    return item.missingValues.length === 0 ? "Experience level is on target" : "Experience is lighter"
  }

  if (item.matchedValues.length === 0) {
    return "No requested coverage"
  }

  if (item.missingValues.length === 0) {
    return "Fully covered"
  }

  return "Partially covered"
}

function getDetailFitSummary(item: MatchDimensionResult) {
  if (item.key === "language") {
    return item.matchedValues.length > 0
      ? `Preferred language supported: ${item.matchedValues[0]}.`
      : `Preferred language not covered: ${item.missingValues[0] ?? "not set"}.`
  }

  if (item.key === "experience") {
    return item.missingValues.length === 0
      ? `Experience level meets the current care brief.`
      : `Experience is below the target inferred from the care brief complexity.`
  }

  return item.missingValues.length === 0
    ? `All requested ${item.label.toLowerCase()} are covered.`
    : `${item.matchedValues.length} covered, ${item.missingValues.length} still missing.`
}

function getDetailListGroups(item: MatchDimensionResult) {
  if (item.key === "language") {
    return [
      {
        label: "Covered",
        values: item.matchedValues,
        emptyLabel: "No matching language",
      },
      {
        label: "Missing",
        values: item.missingValues,
        emptyLabel: "No language gap",
      },
    ]
  }

  if (item.key === "experience") {
    return [
      {
        label: "Caregiver level",
        values: item.matchedValues,
        emptyLabel: "Experience not listed",
      },
      {
        label: "Profile target",
        values: item.missingValues,
        emptyLabel: "Target already met",
      },
    ]
  }

  return [
    {
      label: "Covered",
      values: item.matchedValues.map(formatDisplayLabel),
      emptyLabel: `No ${item.label.toLowerCase()} matched`,
    },
    {
      label: "Still needed",
      values: item.missingValues.map(formatDisplayLabel),
      emptyLabel: "No open gaps",
    },
  ]
}
