import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <section className="page-section">
      <div className="panel-card panel-card-wide">
        <p className="panel-label">Not found</p>
        <h1>This route does not exist.</h1>
        <p>Return to the employer workspace and continue from the care profile dashboard.</p>
        <Link className="button-primary" to="/">
          Go to dashboard
        </Link>
      </div>
    </section>
  )
}
