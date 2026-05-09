import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import heartMascot from "../assets/heart.png"
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
  getRankedCaregiverMatches,
  scoreCaregiverMatch,
  type MatchDimensionResult,
} from "../lib/matching"
import { getMatchReasoning } from "../lib/matchReasoning"
import { buildCaregiverSnapshotPills } from "../lib/caregiverPills"
import { getAgencyLogoById } from "../lib/agencyLogos"
import type { CareProfile } from "../types"

type DetailListGroup = {
  label: string
  values: string[]
  emptyLabel: string
  tone?: "match" | "gap"
}

export function CaregiverDetailPage() {
  const { caregiverId } = useParams()
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
  const isMatchedMode = Boolean(caregiver && activeProfile && matchResult)
  const [isHandoffConfirmOpen, setIsHandoffConfirmOpen] = useState(false)
  const [isHandoffSimulationOpen, setIsHandoffSimulationOpen] = useState(false)
  const [isPracticalOverviewMinimized, setIsPracticalOverviewMinimized] = useState(false)
  const [isFitBreakdownMinimized, setIsFitBreakdownMinimized] = useState(false)
  const [isHeartMascotUnavailable, setIsHeartMascotUnavailable] = useState(false)
  const [llmReasoningState, setLlmReasoningState] = useState<{
    key: string
    reasoning: string | null
    status: "ready" | "error"
  } | null>(null)
  const [, setSavedRevision] = useState(0)
  const savedFlag =
    caregiver && activeProfileId
      ? isCaregiverSavedForProfile(activeProfileId, caregiver.id)
      : false
  const matchReasoningKey =
    isMatchedMode && caregiver && activeProfile
      ? `${activeProfile.id}:${caregiver.id}`
      : null

  useEffect(() => {
    if (!matchReasoningKey || !matchResult || !activeProfile || !caregiver) {
      return
    }

    const reasoningKey = matchReasoningKey
    const reasoningProfile = activeProfile
    const reasoningCaregiver = caregiver
    const reasoningMatchResult = matchResult
    let isCancelled = false

    async function loadMatchReasoning() {
      try {
        const reasoning = await getMatchReasoning(
          reasoningProfile,
          reasoningCaregiver,
          reasoningMatchResult,
        )

        if (!isCancelled) {
          setLlmReasoningState({
            key: reasoningKey,
            reasoning,
            status: "ready",
          })
        }
      } catch (error) {
        console.error("Failed to load match reasoning:", error)

        if (!isCancelled) {
          setLlmReasoningState({
            key: reasoningKey,
            reasoning: null,
            status: "error",
          })
        }
      }
    }

    void loadMatchReasoning()

    return () => {
      isCancelled = true
    }
  }, [activeProfile, caregiver, matchReasoningKey, matchResult])

  const llmReasoning =
    llmReasoningState?.key === matchReasoningKey ? llmReasoningState.reasoning : null
  const llmReasoningError =
    llmReasoningState?.key === matchReasoningKey && llmReasoningState.status === "error"

  function handleToggleSave() {
    if (!caregiver || !activeProfileId) {
      return
    }

    if (savedFlag) {
      removeSavedCaregiverForProfile(activeProfileId, caregiver.id)
      setSavedRevision((value) => value + 1)
      return
    }

    saveCaregiverForProfile(activeProfileId, caregiver.id)
    setSavedRevision((value) => value + 1)
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
  const agencyLogo = getAgencyLogoById(caregiver.agencyId)

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
  const aiReasoningCopy =
    isMatchedMode && matchResult
      ? matchResult.alert
        ? `${matchResult.summary} ${matchResult.alert}`
        : matchResult.summary
      : ""
  const displayedReasoningCopy = llmReasoning ?? aiReasoningCopy

  return (
    <section className="page-section caregiver-detail-page">
      <section className="detail-stage">
        <div className="detail-main">
          <div className="detail-match-overview">
            <div className="detail-primary-stack">
              <section className={`detail-comparison-shell ${isMatchedMode ? "detail-comparison-shell-matched" : ""}`}>
                <section className="caregiver-card detail-hero">
                <div className="detail-hero-body">
                  <div className="detail-portrait">
                    <div className="portrait-frame">
                      {agencyLogo ? (
                        <img alt={`${caregiver.agencyName} logo`} src={agencyLogo} />
                      ) : (
                        <span>{caregiver.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>

                  <div className="caregiver-card-copy detail-hero-content">
                    <div className="detail-hero-header">
                      <div className="detail-hero-heading">
                        <div>
                          <div className="detail-hero-name-row">
                            <h2>{caregiver.name}</h2>
                          </div>
                          <p className="agency-line">{caregiver.agencyName}</p>
                        </div>
                      </div>

                      <div className="detail-hero-actions">
                        <button
                          className="button-primary detail-handoff-button detail-handoff-button-inline"
                          onClick={() => setIsHandoffConfirmOpen(true)}
                          type="button"
                        >
                          Agency handoff
                        </button>
                        {isMatchedMode ? (
                          <button
                            aria-label={savedFlag ? "Remove from shortlist" : "Save to shortlist"}
                            className={`detail-shortlist-star ${savedFlag ? "detail-shortlist-star-active" : ""}`}
                            onClick={handleToggleSave}
                            title={savedFlag ? "Saved to shortlist" : "Save to shortlist"}
                            type="button"
                          >
                            <span aria-hidden="true">{savedFlag ? "★" : "☆"}</span>
                          </button>
                        ) : (
                          <span className="detail-status-chip">
                            {caregiver.availability === "available" ? "Available now" : "Shortlist only"}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="result-summary">{caregiver.bio}</p>

                    {isMatchedMode ? null : (
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
              </section>
            </div>

            {isMatchedMode && matchResult ? (
              <aside className="detail-radar-panel" aria-label="Skills fit chart">
                <p className="detail-fit-summary-score">Match: {matchResult.matchPercent}%</p>
                <DetailSkillsFitRadar breakdown={matchResult.breakdown} />
              </aside>
            ) : null}
          </div>

          {isMatchedMode && matchResult ? (
            <div className="detail-ai-reasoning-row" aria-label="AI reasoning">
              <div className="detail-ai-avatar">
                {isHeartMascotUnavailable ? (
                  <span aria-hidden="true" className="detail-ai-avatar-fallback">❤</span>
                ) : (
                  <img
                    alt="Heart mascot"
                    onError={() => setIsHeartMascotUnavailable(true)}
                    src={heartMascot}
                  />
                )}
              </div>
              <section className="detail-ai-reasoning">
                <div className="detail-ai-reasoning-header">
                  <p className="panel-label">AI reasoning</p>
                  <span className="detail-ai-match-badge">{matchResult.matchPercent}% match</span>
                </div>
                <p className="detail-ai-reasoning-copy">{displayedReasoningCopy}</p>
                {llmReasoningError ? (
                  <p className="detail-supporting-copy">
                    Showing fallback explanation because the live reasoning request failed.
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}

          <section className="section-shell">
            <div className="section-header section-header-tight">
              <button
                aria-controls="practical-overview-content"
                aria-expanded={!isPracticalOverviewMinimized}
                className="section-toggle-heading"
                onClick={() => setIsPracticalOverviewMinimized((value) => !value)}
                type="button"
              >
                <span aria-hidden="true" className="section-toggle-glyph">
                  {isPracticalOverviewMinimized ? "+" : "-"}
                </span>
                <span>Practical Overview</span>
              </button>
            </div>

            {!isPracticalOverviewMinimized ? (
            <div className="detail-meta-master" aria-label="Caregiver overview" id="practical-overview-content">
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
            ) : null}
          </section>

          {isMatchedMode && matchResult && activeProfile ? (
            <section className="section-shell">
              <div className="section-header section-header-tight">
                <button
                  aria-controls="fit-breakdown-content"
                  aria-expanded={!isFitBreakdownMinimized}
                  className="section-toggle-heading"
                  onClick={() => setIsFitBreakdownMinimized((value) => !value)}
                  type="button"
                >
                  <span aria-hidden="true" className="section-toggle-glyph">
                    {isFitBreakdownMinimized ? "+" : "-"}
                  </span>
                  <span>Fit Breakdown</span>
                </button>
              </div>

              {!isFitBreakdownMinimized ? (
              <div className="detail-fit-grid" aria-label="Detailed fit breakdown" id="fit-breakdown-content">
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
                        </div>
                        <span className={`breakdown-chip ${getBreakdownStatusClass(item)}`}>
                          {getCoverageRatioCopy(item)}
                        </span>
                      </div>

                      <div className="detail-fit-lists">
                        {item.key === "experience" ? (
                          <div className="detail-fit-list">
                            <div className="trait-chips">
                              {(() => {
                                const requiredYears = getTargetExperienceYearsForProfile(activeProfile)
                                const currentYears = caregiver.yearsOfExperience
                                const hasEnoughExperience = currentYears >= requiredYears
                                return (
                                  <span
                                    className={`trait-chip detail-fit-pill ${
                                      hasEnoughExperience
                                        ? "detail-fit-pill-match"
                                        : "detail-fit-pill-danger"
                                    }`}
                                  >
                                    <span aria-hidden="true" className="detail-fit-pill-icon">
                                      {hasEnoughExperience ? "✓" : "+"}
                                    </span>
                                    {currentYears} years
                                  </span>
                                )
                              })()}
                            </div>
                            <p className="detail-fit-footnote">
                              Required experience: {getTargetExperienceYearsForProfile(activeProfile)} years.
                            </p>
                          </div>
                        ) : (
                          getDetailListGroups(item, activeProfile).map((group, index) => (
                            <div className="detail-fit-list" key={`${item.key}-${index}`}>
                              {group.label ? <span>{group.label}</span> : null}
                              {group.values.length > 0 ? (
                                <div className="trait-chips">
                                  {group.values.map((value) => (
                                    <span
                                      className={`trait-chip detail-fit-pill ${
                                        group.tone === "gap" ? "detail-fit-pill-gap" : "detail-fit-pill-match"
                                      }`}
                                      key={value}
                                    >
                                      <span aria-hidden="true" className="detail-fit-pill-icon">
                                        {group.tone === "gap" ? "+" : "✓"}
                                      </span>
                                      {toSentenceCase(value)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="detail-empty-copy">{group.emptyLabel}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  ))}
              </div>
              ) : null}
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

function DetailSkillsFitRadar({ breakdown }: { breakdown: MatchDimensionResult[] }) {
  const chartItems = breakdown.filter((item) => item.maxScore > 0).slice(0, 6)

  if (chartItems.length < 3) {
    return null
  }

  const size = 320
  const center = size / 2
  const radius = 88
  const labelRadius = 124
  const levels = [0.25, 0.5, 0.75, 1]
  const labelMap: Record<MatchDimensionResult["key"], string> = {
    language: "Language",
    conditions: "Conditions",
    dailyCareTasks: "Daily tasks",
    mobilitySupport: "Mobility",
    medicationSupport: "Medication",
    experience: "Experience",
  }

  const pointFor = (axisIndex: number, distanceRatio: number, axisRadius = radius) => {
    const angle = (Math.PI * 2 * axisIndex) / chartItems.length - Math.PI / 2
    const pointRadius = axisRadius * distanceRatio
    const x = center + Math.cos(angle) * pointRadius
    const y = center + Math.sin(angle) * pointRadius
    return { x, y }
  }

  const polygonPoints = chartItems
    .map((item, axisIndex) => {
      const point = pointFor(
        axisIndex,
        Math.max(0, Math.min(1, item.maxScore > 0 ? item.score / item.maxScore : 0)),
      )
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
    })
    .join(" ")

  return (
    <figure aria-label="Skills fit radar chart" className="skills-radar detail-skills-radar">
      <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`}>
        {levels.map((level) => (
          <polygon
            className="skills-radar-ring"
            key={level}
            points={chartItems
              .map((_, axisIndex) => {
                const point = pointFor(axisIndex, level)
                return `${point.x.toFixed(2)},${point.y.toFixed(2)}`
              })
              .join(" ")}
          />
        ))}
        {chartItems.map((item, axisIndex) => {
          const axisPoint = pointFor(axisIndex, 1)
          const valuePoint = pointFor(
            axisIndex,
            Math.max(0, Math.min(1, item.maxScore > 0 ? item.score / item.maxScore : 0)),
          )
          const labelPoint = pointFor(axisIndex, 1, labelRadius)

          return (
            <g key={item.key}>
              <line
                className="skills-radar-axis"
                x1={center}
                x2={axisPoint.x}
                y1={center}
                y2={axisPoint.y}
              />
              <circle className="skills-radar-point" cx={valuePoint.x} cy={valuePoint.y} r={4.8} />
              <text className="skills-radar-label" x={labelPoint.x} y={labelPoint.y}>
                {labelMap[item.key]}
              </text>
            </g>
          )
        })}
        <polygon className="skills-radar-shape" points={polygonPoints} />
      </svg>
    </figure>
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

function getCoverageRatioCopy(item: MatchDimensionResult) {
  if (item.key === "experience") {
    return item.missingValues.length === 0 ? "1/1" : "0/1"
  }

  const requestedCount = item.matchedValues.length + item.missingValues.length
  return `${item.matchedValues.length}/${requestedCount}`
}

function getDetailListGroups(item: MatchDimensionResult, profile: CareProfile): DetailListGroup[] {
  const matchedValues = uniqueValues(item.matchedValues)
  const missingValues = uniqueValues(item.missingValues)

  if (item.key === "language") {
    const showMissingGroup = !isFullCoverage(item) && missingValues.length > 0
    return [
      ...(matchedValues.length > 0
        ? [
            {
              label: "",
              values: matchedValues,
              emptyLabel: "",
              tone: "match" as const,
            },
          ]
        : []),
      ...(showMissingGroup
        ? [
            {
              label: "",
              values: missingValues,
              emptyLabel: "",
              tone: "gap" as const,
            },
          ]
        : []),
    ]
  }

  if (item.key === "experience") {
    const targetYears = getTargetExperienceYearsForProfile(profile)
    return [
      {
        label: "",
        values: [`Current: ${item.matchedValues[0] ?? "Not listed"}`],
        emptyLabel: "Experience not listed",
      },
      {
        label: "",
        values: [`Min: ${targetYears} years`],
        emptyLabel: "",
      },
    ]
  }

  const showMissingGroup = !isFullCoverage(item) && missingValues.length > 0
  return [
    ...(matchedValues.length > 0
      ? [
          {
            label: "",
            values: matchedValues.map(formatDisplayLabel),
            emptyLabel: "",
            tone: "match" as const,
          },
        ]
      : []),
    ...(showMissingGroup
      ? [
          {
            label: "",
            values: missingValues.map(formatDisplayLabel),
            emptyLabel: "",
            tone: "gap" as const,
          },
        ]
      : []),
  ]
}

function isFullCoverage(item: MatchDimensionResult) {
  return item.maxScore > 0 && item.score === item.maxScore
}

function getTargetExperienceYearsForProfile(profile: CareProfile) {
  const complexMobilitySkills = new Set([
    "transfer_support",
    "wheelchair_support",
    "bedbound_support",
  ])
  const needsCount =
    profile.conditions.length +
    profile.dailyCareTasks.length +
    profile.mobilitySupport.length +
    profile.medicationSupport.length
  const hasComplexMobilityNeed = profile.mobilitySupport.some((value) =>
    complexMobilitySkills.has(value),
  )

  let targetYears = 2

  if (needsCount >= 4) {
    targetYears += 1
  }

  if (needsCount >= 7) {
    targetYears += 1
  }

  if (profile.conditions.length >= 2) {
    targetYears += 1
  }

  if (hasComplexMobilityNeed || profile.medicationSupport.length >= 2) {
    targetYears += 1
  }

  return Math.min(targetYears, 6)
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values))
}

function toSentenceCase(value: string) {
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return ""
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}
