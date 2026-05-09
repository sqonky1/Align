import { NavLink } from "react-router-dom"

const navItems = [
  { to: "/", label: "Profile", end: true, icon: ProfileIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
]

export function TopNav() {
  return (
    <header className="top-nav">
      <NavLink className="brand-mark" to="/">
        <span className="brand-seal">A</span>
        <span className="brand-copy">
          <strong>Align</strong>
          <span>Helper readiness and matching</span>
        </span>
      </NavLink>

      <nav className="nav-links" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            aria-label={item.label}
            key={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
            end={item.end}
            to={item.to}
          >
            <item.icon />
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <circle cx="9" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 15a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <circle cx="8" cy="8" r="4.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m11.75 11.75 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}
