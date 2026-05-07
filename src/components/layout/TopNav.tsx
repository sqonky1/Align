import { NavLink } from "react-router-dom"

const navItems = [
  { to: "/", label: "Employer Profile", end: true },
  { to: "/search", label: "Search" },
]

export function TopNav() {
  return (
    <header className="top-nav">
      <NavLink className="brand-mark" to="/">
        <span className="brand-seal">A</span>
        <span className="brand-copy">
          <strong>Align</strong>
          <span>Caregiver readiness and matching</span>
        </span>
      </NavLink>

      <nav className="nav-links" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
            end={item.end}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
