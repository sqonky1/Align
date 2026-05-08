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
    matchRank && matchRank <= 3 ? getFeaturedCardClass(matchRank - 1) : undefined
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
      values: caregiver.languages,
    },
    {
      title: "Care conditions",
      values: caregiver.careConditions.map(formatDisplayLabel),
    },
    {
      title: "Daily care tasks",
      values: caregiver.careTasks.map(formatDisplayLabel),
    },
    {
      title: "Mobility support",
      values: caregiver.mobilitySkills.map(formatDisplayLabel),
    },
    {
      title: "Medication support",
      values: caregiver.medicationSkills.map(formatDisplayLabel),
    },
    {
      title: "Training",
      values: caregiver.training,
    },
    {
      title: "Certifications",
      values: caregiver.certifications,
      emptyLabel: "No certification listed",
    },
  ]

  return (
    <section className="page-section">
      <div className="detail-backnav">
        <button className="button-secondary" onClick={() => navigate(-1)} type="button">
          Back to search
        </button>
      </div>

      <section className="detail-stage">
        <div className="detail-main">
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
                    {!isMatchedMode ? (
                      <span className="profile-glyph">{caregiver.name.charAt(0)}</span>
                    ) : null}
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
                  <div className="trait-chips" aria-label="Caregiver snapshot">
                    <span className="trait-chip">{caregiver.nationality}</span>
                    <span className="trait-chip">{formatDisplayLabel(caregiver.gender)}</span>
                    <span className="trait-chip">{caregiver.yearsOfExperience} years</span>
                    {caregiver.languages.slice(0, 2).map((language) => (
                      <span className="trait-chip" key={language}>
                        {language}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Profile snapshot</p>
                <h2>Practical overview</h2>
              </div>
            </div>

            <div className="detail-meta-grid" aria-label="Caregiver overview">
              <article className="detail-meta-card">
                <p className="panel-label">Core profile</p>
                <div className="detail-list">
                  <div className="signal-row">
                    <span>Age</span>
                    <strong>{caregiver.age}</strong>
                  </div>
                  <div className="signal-row">
                    <span>Gender</span>
                    <strong>{formatDisplayLabel(caregiver.gender)}</strong>
                  </div>
                  <div className="signal-row">
                    <span>Nationality</span>
                    <strong>{caregiver.nationality}</strong>
                  </div>
                  <div className="signal-row">
                    <span>Experience</span>
                    <strong>{caregiver.yearsOfExperience} years</strong>
                  </div>
                </div>
              </article>

              {capabilitySections.map((section) => (
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
    </section>
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

function getFeaturedCardClass(index: number) {
  if (index === 0) {
    return "caregiver-card-rank-gold"
  }

  if (index === 1) {
    return "caregiver-card-rank-silver"
  }

  return "caregiver-card-rank-bronze"
}
