import { Link } from "react-router-dom"

type CaregiverCardProps = {
  href: string
  name: string
  agency: string
  summary?: string
  traits: string[]
  matchPercent?: number | null
  secondaryText?: string
  cornerText?: string
  compact?: boolean
}

export function CaregiverCard({
  href,
  name,
  agency,
  summary,
  traits,
  matchPercent = null,
  secondaryText,
  cornerText,
  compact = false,
}: CaregiverCardProps) {
  return (
    <Link
      className={`caregiver-card caregiver-card-link ${compact ? "caregiver-card-compact" : ""}`.trim()}
      to={href}
    >
      {cornerText ? <span className="card-corner-note">{cornerText}</span> : null}

      <div className="portrait-block">
        <div className="portrait-frame">
          <span>{name.charAt(0)}</span>
        </div>
        {matchPercent !== null ? (
          <span className="score-token">
            <span>{matchPercent}%</span>
            <span>match</span>
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

        <div className="trait-chips">
          {traits.map((trait) => (
            <span className="trait-chip" key={trait}>
              {trait}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
