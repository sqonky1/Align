import { Link } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import { PageHeader } from "../components/layout/PageHeader"
import {
  getCareProfileCardData,
  getSavedCaregiverGalleryData,
} from "../lib/data"

export function UserProfilePage() {
  const careProfiles = getCareProfileCardData()
  const savedCaregivers = getSavedCaregiverGalleryData()

  return (
    <section className="page-section">
      <PageHeader title="Welcome back." description="" />

      <section className="section-shell">
        <div className="section-header">
          <h2>Care profiles</h2>
          <Link className="button-primary" to="/profiles/new">
            Create care profile
          </Link>
        </div>

        <div className="profile-card-grid" aria-label="Care profiles">
          {careProfiles.map((profile) => (
            <CareProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      </section>

      <section className="split-stage">
        <section className="section-shell">
          <div className="section-header">
            <h2>Saved caregivers</h2>
          </div>

          <div className="saved-gallery" aria-label="Saved caregivers preview">
            {savedCaregivers.map((caregiver) => (
              <CaregiverCard
                agency={caregiver.agency}
                href={`/caregivers/${caregiver.caregiverId}?profile=${caregiver.careProfileId}`}
                key={caregiver.id}
                name={caregiver.name}
                secondaryText={caregiver.note}
                summary={caregiver.summary}
                traits={caregiver.traits}
              />
            ))}
          </div>
        </section>
      </section>
    </section>
  )
}
