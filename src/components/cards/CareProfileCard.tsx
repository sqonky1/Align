import { Link } from "react-router-dom"
import { formatDisplayLabel } from "../../lib/data"
import { getMatchSearchHref } from "../../lib/matchNavigation"
import type { CareProfileWorkspaceCard } from "../../types"

type CareProfileCardProps = {
  profile: CareProfileWorkspaceCard
  href?: string
  onSelect?: (() => void) | undefined
  onDelete?: (() => void) | undefined
  showActions?: boolean
  className?: string
  variant?: "default" | "anchor"
  contextLabel?: string
  interactive?: boolean
}

export function CareProfileCard({
  profile,
  href = `/profiles/${profile.id}`,
  onSelect,
  onDelete,
  showActions = true,
  className,
  variant = "default",
  contextLabel,
  interactive = true,
}: CareProfileCardProps) {
  const resolvedContextLabel = contextLabel ?? "Matching for profile"

  const cardClassName = [
    "profile-card",
    interactive ? "profile-card-clickable" : null,
    onSelect ? "profile-card-selectable" : null,
    variant === "anchor" ? "profile-card-anchor" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <article
      aria-label={onSelect ? `Select ${profile.name}` : undefined}
      className={cardClassName}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect()
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {interactive && !onSelect ? (
        <Link
          aria-label={`Open ${profile.name} care recipient details`}
          className="profile-card-overlay"
          to={href}
        />
      ) : null}

      <div className="profile-card-top">
        <span className="profile-glyph" aria-hidden="true">
          {profile.name.charAt(0)}
        </span>

        {showActions ? (
          <Link className="profile-card-action profile-card-action-match" to={getMatchSearchHref(profile.id)}>
            <SearchIcon />
            <span>Find a match</span>
          </Link>
        ) : null}
      </div>

      <div className="profile-card-copy">
        <p className="profile-card-context-label">{resolvedContextLabel}</p>
        <h3>{profile.name}</h3>
        <p>
          {profile.age} years old · {formatDisplayLabel(profile.gender)} ·{" "}
          {profile.preferredLanguage}
        </p>
      </div>

      {showActions ? (
        <div className="profile-card-footer-actions">
          {onDelete ? (
            <button
              aria-label={`Delete ${profile.name} care profile`}
              className="profile-card-icon-action profile-card-icon-action-delete"
              onClick={onDelete}
              type="button"
            >
              <TrashIcon />
            </button>
          ) : null}
          <Link
            aria-label={`Edit ${profile.name} care profile`}
            className="profile-card-icon-action profile-card-icon-action-edit"
            to={`/profiles/${profile.id}/edit`}
          >
            <PencilIcon />
          </Link>
        </div>
      ) : null}
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

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="M2.667 4h10.666"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="M6 2.667h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
      <path
        d="M5.333 6.667v4.666M8 6.667v4.666m2.667-4.666v4.666M4 4l.667 8.667A1.333 1.333 0 0 0 6 14h4a1.333 1.333 0 0 0 1.333-1.333L12 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}
