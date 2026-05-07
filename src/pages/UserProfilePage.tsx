import { Link } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"

const careProfiles = [
  {
    name: "Madam Lim",
    summary: "78 years old",
    details: ["Dementia", "Diabetes", "Mandarin"],
    status: "Ready for search",
  },
  {
    name: "Mr Tan",
    summary: "82 years old",
    details: ["Stroke recovery", "Transfer support", "English"],
    status: "Draft profile",
  },
]

const savedCaregivers = [
  {
    name: "Maria Santos",
    note: "Saved for Madam Lim",
    traits: ["Dementia care", "Mandarin", "8 years"],
  },
  {
    name: "Grace Villanueva",
    note: "Saved for Mr Tan",
    traits: ["Stroke support", "Transfers", "9 years"],
  },
]

export function UserProfilePage() {
  return (
    <section className="page-section">
      <div className="profile-hero">
        <PageHeader
          eyebrow="Employer profile"
          title="One workspace for care profiles and saved caregivers."
          description="Organise the seniors you are hiring for, keep shortlisted caregivers in one place, and move into search when each care brief is ready."
        />

        <div className="profile-aside">
          <p className="panel-label">Workspace logic</p>
          <p>
            Care profiles live here. Saved caregivers live here. Search becomes the dedicated
            route for matching and discovery.
          </p>
        </div>
      </div>

      <section className="section-shell">
        <div className="section-header">
          <div>
            <p className="panel-label">Care profiles</p>
            <h2>Build senior care briefs before you search</h2>
          </div>
          <Link className="button-primary" to="/profiles/new">
            Create care profile
          </Link>
        </div>

        <div className="profile-card-grid" aria-label="Care profiles">
          {careProfiles.map((profile) => (
            <article className="profile-card" key={profile.name}>
              <div className="profile-card-top">
                <span className="profile-glyph" aria-hidden="true">
                  {profile.name.charAt(0)}
                </span>
                <span className="status-chip">{profile.status}</span>
              </div>

              <div className="profile-card-copy">
                <h3>{profile.name}</h3>
                <p>{profile.summary}</p>
                <div className="trait-chips">
                  {profile.details.map((detail) => (
                    <span className="trait-chip" key={detail}>
                      {detail}
                    </span>
                  ))}
                </div>
              </div>

              <div className="profile-card-actions">
                <Link className="inline-action" to="/search">
                  Search caregivers
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="split-stage">
        <section className="section-shell">
          <div className="section-header">
            <div>
              <p className="panel-label">Saved caregivers</p>
              <h2>Keep likely candidates tied to each care brief</h2>
            </div>
          </div>

          <div className="saved-gallery" aria-label="Saved caregivers preview">
            {savedCaregivers.map((caregiver) => (
              <article className="saved-card" key={caregiver.name}>
                <div className="portrait-block portrait-block-compact">
                  <div className="portrait-frame portrait-frame-small">
                    <span>{caregiver.name.charAt(0)}</span>
                  </div>
                </div>
                <div className="saved-card-copy">
                  <h3>{caregiver.name}</h3>
                  <p>{caregiver.note}</p>
                  <div className="trait-chips">
                    {caregiver.traits.map((trait) => (
                      <span className="trait-chip" key={trait}>
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="callout-panel">
          <p className="panel-label">Search route</p>
          <h2>Matching belongs in search, not inside the profile workspace.</h2>
          <p>
            Keeping discovery separate makes the employer workspace feel more intentional and
            reduces visual clutter on the main page.
          </p>
          <Link className="button-secondary" to="/search">
            Open search
          </Link>
        </aside>
      </section>
    </section>
  )
}
