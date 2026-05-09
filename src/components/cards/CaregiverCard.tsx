import { Link } from "react-router-dom"
import { getAgencyLogoById } from "../../lib/agencyLogos"
import type { SearchCaregiverPill } from "../../types"

type CaregiverCardProps = {
  href: string
  name: string
  agencyId: string
  agency: string
  summary?: string
  traits: Array<string | SearchCaregiverPill>
  matchPercent?: number | null
  secondaryText?: string
  cornerText?: string
  compact?: boolean
  className?: string
}

export function CaregiverCard({
  href,
  name,
  agencyId,
  agency,
  summary,
  traits,
  matchPercent = null,
  secondaryText,
  cornerText,
  compact = false,
  className,
}: CaregiverCardProps) {
  const agencyLogo = getAgencyLogoById(agencyId)

  return (
    <Link
      className={`caregiver-card caregiver-card-link ${compact ? "caregiver-card-compact" : ""} ${matchPercent !== null ? "caregiver-card-has-score" : ""} ${className ?? ""}`.trim()}
      to={href}
    >
      {cornerText ? <span className="card-corner-note">{cornerText}</span> : null}

      <div className="portrait-block">
        <div className="portrait-frame">
          {agencyLogo ? <img alt={`${agency} logo`} src={agencyLogo} /> : <span>{name.charAt(0)}</span>}
        </div>
        {matchPercent !== null ? (
          <span className="score-token">
            <span>{matchPercent}%</span>
            <span>{" match"}</span>
          </span>
        ) : null}
      </div>

      <div className="caregiver-card-copy">
        <div>
          <h2>{name}</h2>
          <p className="agency-line">{agency}</p>
          {secondaryText ? <p className="toolbar-caption">{secondaryText}</p> : null}
        </div>

        {summary ? <p className="result-summary">{summary}</p> : null}

        <div className={traits.some((trait) => typeof trait !== "string" && trait.tone) ? "breakdown-chip-list" : "trait-chips"}>
          {traits.map((trait) => (
            <span
              className={getTraitClassName(trait)}
              key={typeof trait === "string" ? trait : `${trait.label}-${trait.tone ?? "default"}`}
            >
              {typeof trait === "string" ? trait : trait.label}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function getTraitClassName(trait: string | SearchCaregiverPill) {
  if (typeof trait === "string" || !trait.tone) {
    return "trait-chip"
  }

  return `breakdown-chip breakdown-chip-${trait.tone}`
}
