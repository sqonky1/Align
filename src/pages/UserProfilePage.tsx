import { useState } from "react"
import { Link } from "react-router-dom"
import { CaregiverCard } from "../components/cards/CaregiverCard"
import { CareProfileCard } from "../components/cards/CareProfileCard"
import { PageHeader } from "../components/layout/PageHeader"
import {
  deleteCareProfile,
  getCareProfileCardData,
  getSavedCaregiverGalleryData,
} from "../lib/data"

export function UserProfilePage() {
  const [careProfiles, setCareProfiles] = useState(() => getCareProfileCardData())
  const savedCaregivers = getSavedCaregiverGalleryData()

  function handleDeleteProfile(profileId: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this care recipient profile?")

      if (!confirmed) {
        return
      }
    }

    deleteCareProfile(profileId)
    setCareProfiles((currentProfiles) =>
      currentProfiles.filter((profile) => profile.id !== profileId),
    )
  }

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
            <CareProfileCard
              key={profile.id}
              onDelete={() => handleDeleteProfile(profile.id)}
              profile={profile}
            />
          ))}
        </div>
      </section>

      <section className="section-shell">
        <div className="section-header">
          <h2>Shortlisted caregivers</h2>
        </div>

        <div className="saved-gallery" aria-label="Shortlisted caregivers preview">
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
  )
}
