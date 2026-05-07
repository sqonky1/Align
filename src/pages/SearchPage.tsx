import { Link } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"

const previewCaregivers = [
  {
    name: "Maria Santos",
    agency: "SilverCare Agency",
    score: "89",
    summary: "Mandarin speaking with strong dementia routine support and relevant diabetes care exposure.",
    traits: ["Language fit", "Dementia care", "8 years"],
  },
  {
    name: "Ani Susanti",
    agency: "Harmony Eldercare Placement",
    score: "78",
    summary: "Strong day-to-day eldercare support with useful mobility handling and medication reminder experience.",
    traits: ["Mandarin", "Transfer support", "6 years"],
  },
  {
    name: "Elena Ramos",
    agency: "NestAid Services",
    score: "74",
    summary: "Warm dementia support profile with feeding and companionship experience for lower-intensity routines.",
    traits: ["Companionship", "Feeding", "5 years"],
  },
]

export function SearchPage() {
  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Search"
        title="Search caregivers through the lens of a care profile."
        description="This route is ready for ranked results, applied filters, and practical fit reasoning once the matching engine lands."
      />

      <section className="search-stage">
        <div className="search-toolbar">
          <div>
            <p className="panel-label">Active profile</p>
            <h2>Madam Lim</h2>
          </div>
          <div className="filter-pills" aria-label="Filter preview">
            <span>Mandarin</span>
            <span>Dementia</span>
            <span>Walking assistance</span>
          </div>
        </div>

        <div className="gallery-grid" aria-label="Caregiver search preview">
          {previewCaregivers.map((caregiver, index) => (
            <article className="caregiver-card" key={caregiver.name}>
              <div className="portrait-block">
                <div className="portrait-frame">
                  <span>{caregiver.name.charAt(0)}</span>
                </div>
                <span className="score-token">{caregiver.score}% match</span>
              </div>

              <div className="caregiver-card-copy">
                <div>
                  <p className="panel-label">{index === 0 ? "Top fit" : "Relevant fit"}</p>
                  <h2>{caregiver.name}</h2>
                  <p className="agency-line">{caregiver.agency}</p>
                </div>

                <p className="result-summary">{caregiver.summary}</p>

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

        <aside className="result-sidebar">
          <p className="panel-label">Search route</p>
          <p>
            This page now previews the gallery-style browsing direction. The next phase will swap
            in real caregiver data, save actions, and score-based ordering.
          </p>
          <Link className="button-secondary" to="/">
            Return to employer profile
          </Link>
        </aside>
      </section>
    </section>
  )
}
