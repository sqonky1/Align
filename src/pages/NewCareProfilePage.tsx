import { type ChangeEvent, type FormEvent, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"
import {
  buildCareProfileFromForm,
  type CareProfileOption,
  conditionOptions,
  dailyCareTaskOptions,
  getEmptyCareProfileFormValues,
  householdContextOptions,
  languageOptions,
  medicationSupportOptions,
  mobilitySupportOptions,
  toCareProfileFormValues,
} from "../lib/careProfiles"
import {
  formatDisplayLabel,
  getCareProfileById,
  saveCareProfile,
} from "../lib/data"
import type { CareProfileFormValues } from "../types"

export function NewCareProfilePage() {
  const { profileId } = useParams()
  const existingProfile = useMemo(
    () => (profileId ? getCareProfileById(profileId) : null),
    [profileId],
  )
  const isEditing = Boolean(profileId)
  if (isEditing && !existingProfile) {
    return (
      <section className="page-section">
        <PageHeader
          eyebrow="Edit care profile"
          title="This care profile could not be found."
          description="Return to the employer workspace and choose another profile to edit."
        />

        <section className="editor-stage">
          <article className="editor-canvas">
            <div className="empty-editor-state">
              <h2>Missing profile</h2>
              <p>The requested care profile is not available in the current workspace.</p>
              <Link className="button-primary" to="/">
                Return to employer profile
              </Link>
            </div>
          </article>
        </section>
      </section>
    )
  }

  return (
    <CareProfileEditor
      existingProfile={existingProfile}
      isEditing={isEditing}
      key={profileId ?? "new"}
    />
  )
}

type CareProfileEditorProps = {
  existingProfile: ReturnType<typeof getCareProfileById>
  isEditing: boolean
}

function CareProfileEditor({ existingProfile, isEditing }: CareProfileEditorProps) {
  const navigate = useNavigate()
  const [formValues, setFormValues] = useState<CareProfileFormValues>(() =>
    existingProfile ? toCareProfileFormValues(existingProfile) : getEmptyCareProfileFormValues(),
  )
  const summaryItems = useMemo(
    () => [
      {
        label: "Conditions",
        value:
          formValues.conditions.length > 0
            ? formValues.conditions.map(formatDisplayLabel).join(", ")
            : "Not selected yet",
      },
      {
        label: "Daily care",
        value:
          formValues.dailyCareTasks.length > 0
            ? formValues.dailyCareTasks.map(formatDisplayLabel).join(", ")
            : "Not selected yet",
      },
      {
        label: "Mobility and medication",
        value:
          [...formValues.mobilitySupport, ...formValues.medicationSupport].length > 0
            ? [...formValues.mobilitySupport, ...formValues.medicationSupport]
                .map(formatDisplayLabel)
                .join(", ")
            : "Not selected yet",
      },
    ],
    [
      formValues.conditions,
      formValues.dailyCareTasks,
      formValues.medicationSupport,
      formValues.mobilitySupport,
    ],
  )
  const canSave =
    formValues.name.trim().length > 0 &&
    formValues.age.trim().length > 0 &&
    formValues.gender !== "" &&
    formValues.preferredLanguage !== ""

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleArrayToggle(field: ArrayFieldName, value: string) {
    setFormValues((current) => {
      const existingValues = current[field]
      const nextValues = existingValues.includes(value)
        ? existingValues.filter((entry) => entry !== value)
        : [...existingValues, value]

      return {
        ...current,
        [field]: nextValues,
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSave) {
      return
    }

    const profile = buildCareProfileFromForm(formValues, existingProfile)
    saveCareProfile(profile)
    navigate("/")
  }

  return (
    <section className="page-section">
      <PageHeader
        eyebrow={isEditing ? "Edit care profile" : "Create care profile"}
        title={
          isEditing
            ? "Refine the care brief before you search."
            : "Capture senior care needs in a structured brief."
        }
        description="Keep the profile concise, structured, and specific enough for caregiver matching to make sense."
      />

      <section className="editor-stage">
        <form className="editor-canvas form-shell" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Basic details</p>
                <h2>Senior profile essentials</h2>
              </div>
            </div>

            <div className="field-grid">
              <label className="form-field">
                <span>Name</span>
                <input
                  name="name"
                  onChange={handleFieldChange}
                  placeholder="e.g. Madam Lim"
                  value={formValues.name}
                />
              </label>

              <label className="form-field">
                <span>Age</span>
                <input
                  inputMode="numeric"
                  name="age"
                  onChange={handleFieldChange}
                  placeholder="e.g. 78"
                  value={formValues.age}
                />
              </label>

              <label className="form-field">
                <span>Gender</span>
                <select name="gender" onChange={handleFieldChange} value={formValues.gender}>
                  <option value="">Select gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </label>

              <label className="form-field">
                <span>Preferred language</span>
                <select
                  name="preferredLanguage"
                  onChange={handleFieldChange}
                  value={formValues.preferredLanguage}
                >
                  <option value="">Select language</option>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="inline-note">
              <p>Saved profiles remain editable. Search readiness is inferred from the fields you complete.</p>
            </div>
          </section>

          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Care needs</p>
                <h2>Describe the support needed day to day</h2>
              </div>
            </div>

            <OptionGroup
              field="conditions"
              label="Conditions"
              options={conditionOptions}
              selectedValues={formValues.conditions}
              onToggle={handleArrayToggle}
            />

            <OptionGroup
              field="dailyCareTasks"
              label="Daily care tasks"
              options={dailyCareTaskOptions}
              selectedValues={formValues.dailyCareTasks}
              onToggle={handleArrayToggle}
            />
          </section>

          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Support complexity</p>
                <h2>Note mobility, medication, and home context</h2>
              </div>
            </div>

            <OptionGroup
              field="mobilitySupport"
              label="Mobility support"
              options={mobilitySupportOptions}
              selectedValues={formValues.mobilitySupport}
              onToggle={handleArrayToggle}
            />

            <OptionGroup
              field="medicationSupport"
              label="Medication and monitoring"
              options={medicationSupportOptions}
              selectedValues={formValues.medicationSupport}
              onToggle={handleArrayToggle}
            />

            <OptionGroup
              field="householdContext"
              label="Household context"
              options={householdContextOptions}
              selectedValues={formValues.householdContext}
              onToggle={handleArrayToggle}
            />
          </section>

          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Notes</p>
                <h2>Add risk cues and family context</h2>
              </div>
            </div>

            <label className="form-field">
              <span>Risk notes</span>
              <small>Context only for now. These notes will not affect the match score directly.</small>
              <textarea
                name="riskNotes"
                onChange={handleFieldChange}
                placeholder="e.g. Night wandering risk, help needed during transfers."
                rows={4}
                value={formValues.riskNotes}
              />
            </label>

            <label className="form-field">
              <span>Additional notes</span>
              <small>Useful for family preferences or home setup. Structured fields drive matchmaking.</small>
              <textarea
                name="additionalNotes"
                onChange={handleFieldChange}
                placeholder="e.g. Family routines, communication preferences, home setup."
                rows={4}
                value={formValues.additionalNotes}
              />
            </label>
          </section>

          <div className="form-actions">
            <Link className="button-secondary" to="/">
              Cancel
            </Link>
            <button className="button-primary" disabled={!canSave} type="submit">
              {isEditing ? "Save changes" : "Save care profile"}
            </button>
          </div>
        </form>

        <aside className="editor-notes summary-panel">
          <p className="panel-label">Profile summary</p>
          <h2>{formValues.name || "New care profile"}</h2>
          <p>
            {formValues.age ? `${formValues.age} years old` : "Age not entered"}
            {formValues.preferredLanguage ? ` • ${formValues.preferredLanguage}` : ""}
          </p>

          <div className="summary-badges">
            {formValues.gender ? (
              <span className="trait-chip">{formatDisplayLabel(formValues.gender)}</span>
            ) : null}
          </div>

          <div className="summary-list">
            {summaryItems.map((item) => (
              <div className="summary-item" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="summary-note">
            <p className="panel-label">Later step</p>
            <p>Medical-note upload and AI extraction will be added on top of this structured form.</p>
          </div>
        </aside>
      </section>
    </section>
  )
}

type ArrayFieldName =
  | "conditions"
  | "dailyCareTasks"
  | "mobilitySupport"
  | "medicationSupport"
  | "householdContext"

type OptionGroupProps = {
  field: ArrayFieldName
  label: string
  options: CareProfileOption[]
  selectedValues: string[]
  onToggle: (field: ArrayFieldName, value: string) => void
}

function OptionGroup({ field, label, options, selectedValues, onToggle }: OptionGroupProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const filteredOptions = options.filter((option) => {
    if (selectedValues.includes(option.value)) {
      return false
    }

    return option.label.toLowerCase().includes(query.trim().toLowerCase())
  })

  function handleAdd(value: string) {
    onToggle(field, value)
    setQuery("")
    setIsOpen(false)
  }

  return (
    <div className="option-group">
      <div className="option-group-header">
        <span>{label}</span>
      </div>

      <div className="option-picker-row">
        <input
          className="option-select"
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Select"
          value={query}
        />
        {isOpen && filteredOptions.length > 0 ? (
          <div className="option-search-results">
            {filteredOptions.slice(0, 6).map((option) => (
              <button
                className="option-result"
                key={option.value}
                onClick={() => handleAdd(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen && query.trim().length > 0 && filteredOptions.length === 0 ? (
        <p className="option-empty-state">No matches found.</p>
      ) : null}

      {selectedValues.length > 0 ? (
        <div className="option-grid">
          {selectedValues.map((value) => (
            <button
              className="option-chip option-chip-active"
              key={value}
              onClick={() => onToggle(field, value)}
              type="button"
            >
              {formatDisplayLabel(value)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="option-empty-state">No selections yet.</p>
      )}
    </div>
  )
}
