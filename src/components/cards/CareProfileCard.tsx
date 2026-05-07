import { Link } from "react-router-dom"
import { formatDisplayLabel } from "../../lib/data"
import type { CareProfileWorkspaceCard } from "../../types"

type CareProfileCardProps = {
  profile: CareProfileWorkspaceCard
  href?: string
  onSelect?: (() => void) | undefined
  showActions?: boolean
  className?: string
  variant?: "default" | "anchor" | "picker"
}

export function CareProfileCard({
  profile,
  href = `/profiles/${profile.id}`,
  onSelect,
  showActions = true,
  className,
  variant = "default",
}: CareProfileCardProps) {
  const cardClassName = [
    "profile-card",
    "profile-card-clickable",
    variant === "anchor" ? "profile-card-anchor" : null,
    variant === "picker" ? "profile-card-picker" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <article className={cardClassName}>
      {onSelect ? (
        <button
          aria-label={`Select ${profile.name}`}
          className="profile-card-overlay-button"
          onClick={onSelect}
          type="button"
        />
      ) : (
        <Link
          aria-label={`Open ${profile.name} care profile`}
          className="profile-card-overlay"
          to={href}
        />
      )}

      <div className="profile-card-top">
        <span className="profile-glyph" aria-hidden="true">
          {profile.name.charAt(0)}
        </span>

        {showActions ? (
          <div className="profile-card-actions-stack">
            <Link className="profile-card-action" to={`/profiles/${profile.id}/edit`}>
              <PencilIcon />
              <span>Edit profile</span>
            </Link>
            <Link className="profile-card-action" to={`/search?profile=${profile.id}`}>
              <SearchIcon />
              <span>Find a match</span>
            </Link>
          </div>
        ) : null}
      </div>

      <div className="profile-card-copy">
        {variant === "anchor" ? (
          <p className="profile-card-context-label">Matching for profile</p>
        ) : null}
        <h3>{profile.name}</h3>
        <p>
          {profile.age} years old · {formatDisplayLabel(profile.gender)} ·{" "}
          {profile.preferredLanguage}
        </p>
      </div>
    </article>
  )
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M10.667 2.667a1.886 1.886 0 1 1 2.666 2.666L5.333 13.333 2 14l.667-3.333 8-8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m10.5 10.5 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}
