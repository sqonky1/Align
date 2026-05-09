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
  const [activeTab, setActiveTab] = useState<"profiles" | "shortlist">("profiles")
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
      <PageHeader title="Home" description="" />

      <div className="workspace-tabs" aria-label="Workspace sections" role="tablist">
        <button
          aria-controls="workspace-tabpanel-profiles"
          aria-selected={activeTab === "profiles"}
          className={`workspace-tab-trigger ${activeTab === "profiles" ? "workspace-tab-trigger-active" : ""}`.trim()}
          id="workspace-tab-profiles"
          onClick={() => setActiveTab("profiles")}
          role="tab"
          type="button"
        >
          Care profiles
        </button>
        <button
          aria-controls="workspace-tabpanel-shortlist"
          aria-selected={activeTab === "shortlist"}
          className={`workspace-tab-trigger ${activeTab === "shortlist" ? "workspace-tab-trigger-active" : ""}`.trim()}
          id="workspace-tab-shortlist"
          onClick={() => setActiveTab("shortlist")}
          role="tab"
          type="button"
        >
          Shortlisted helpers
        </button>
      </div>

      {activeTab === "profiles" ? (
        <section
          aria-labelledby="workspace-tab-profiles"
          className="section-shell workspace-tab-panel-shell"
          id="workspace-tabpanel-profiles"
          role="tabpanel"
        >
          <div className="section-header">
            <h2>Care profiles</h2>
            <Link className="button-primary" to="/profiles/new">
              Create care profile
            </Link>
          </div>

          <div className="profile-card-grid" aria-label="Care profiles">
            {careProfiles.map((profile) => (
              <CareProfileCard
                contextLabel=""
                className="profile-card-home-compact"
                key={profile.id}
                onDelete={() => handleDeleteProfile(profile.id)}
                profile={profile}
                showGlyph={false}
              />
            ))}
          </div>
          {careProfiles.length === 0 ? <p className="workspace-empty-copy">Care profiles will appear here.</p> : null}
        </section>
      ) : (
        <section
          aria-labelledby="workspace-tab-shortlist"
          className="section-shell workspace-tab-panel-shell"
          id="workspace-tabpanel-shortlist"
          role="tabpanel"
        >
          <div className="section-header">
            <h2>Shortlisted Helpers</h2>
          </div>

          <div className="saved-gallery employer-shortlist-gallery" aria-label="Shortlisted helpers preview">
            {savedCaregivers.map((caregiver) => (
              <CaregiverCard
                agencyId={caregiver.agencyId}
                agency={caregiver.agency}
                className="matched-gallery-card"
                href={`/caregivers/${caregiver.caregiverId}?profile=${caregiver.careProfileId}`}
                key={caregiver.id}
                matchPercent={caregiver.matchPercent}
                name={caregiver.name}
                secondaryText={caregiver.note}
                summary={caregiver.summary}
                traits={caregiver.traits}
              />
            ))}
          </div>
          {savedCaregivers.length === 0 ? (
            <p className="workspace-empty-copy">Shortlisted helpers will appear here.</p>
          ) : null}
        </section>
      )}
    </section>
  )
}
