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
import { formatDisplayLabel, getCareProfileById, saveCareProfile } from "../lib/data"
import type { CareProfileFormValues } from "../types"
import {
  extractCareProfileFromDocuments,
  type CareProfileFieldReview,
  type CareProfileSuggestedValue,
} from "../features/careProfileIntake/api"
import { mergeCareProfileExtraction } from "../features/careProfileIntake/merge"
import type { CareProfileCreationMode } from "../features/careProfileIntake/types"

const HIGH_CONFIDENCE_THRESHOLD = 0.85

type SuggestionKey = `${string}:${string}`

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
        <PageHeader eyebrow="Edit care profile" title="This care profile could not be found." description="" />

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

  return <CareProfileEditor existingProfile={existingProfile} isEditing={isEditing} />
}

type CareProfileEditorProps = {
  existingProfile: ReturnType<typeof getCareProfileById>
  isEditing: boolean
}

function CareProfileEditor({ existingProfile, isEditing }: CareProfileEditorProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<CareProfileCreationMode | null>(isEditing ? "manual" : null)
  const [formValues, setFormValues] = useState<CareProfileFormValues>(() =>
    existingProfile ? toCareProfileFormValues(existingProfile) : getEmptyCareProfileFormValues(),
  )
  const [fieldReviews, setFieldReviews] = useState<
    Partial<Record<keyof CareProfileFormValues, CareProfileFieldReview>>
  >({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [hasCompletedExtraction, setHasCompletedExtraction] = useState(false)
  const [userEditedFields, setUserEditedFields] = useState<Set<keyof CareProfileFormValues>>(
    new Set(),
  )
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<SuggestionKey>>(new Set())

  const summaryItems = useMemo(
    () => [
      { label: "Name", value: formValues.name || "Pending" },
      { label: "Age", value: formValues.age ? `${formValues.age} years old` : "Pending" },
      { label: "Gender", value: formValues.gender ? formatDisplayLabel(formValues.gender) : "Pending" },
      {
        label: "Preferred languages",
        value: formValues.preferredLanguages.length > 0 ? formValues.preferredLanguages.join(", ") : "Pending",
      },
      { label: "Primary language", value: formValues.preferredLanguage || "Pending" },
      {
        label: "Conditions",
        value: formValues.conditions.length > 0 ? formValues.conditions.map(formatDisplayLabel).join(", ") : "Pending",
      },
      {
        label: "Support needs",
        value:
          [...formValues.dailyCareTasks, ...formValues.mobilitySupport, ...formValues.medicationSupport]
            .map(formatDisplayLabel)
            .slice(0, 5)
            .join(", ") || "Pending",
      },
    ],
    [
      formValues.age,
      formValues.conditions,
      formValues.dailyCareTasks,
      formValues.gender,
      formValues.medicationSupport,
      formValues.mobilitySupport,
      formValues.name,
      formValues.preferredLanguage,
      formValues.preferredLanguages,
    ],
  )

  const canSave =
    formValues.name.trim().length > 0 &&
    formValues.age.trim().length > 0 &&
    formValues.gender !== "" &&
    formValues.preferredLanguages.length > 0 &&
    formValues.preferredLanguage.trim().length > 0

  const shouldShowForm = isEditing || mode === "manual" || (mode === "autofill" && hasCompletedExtraction)

  function markUserEdited(field: keyof CareProfileFormValues) {
    setUserEditedFields((current) => new Set(current).add(field))
  }

  function dismissSuggestion(field: keyof CareProfileFormValues, value: string) {
    setDismissedSuggestions((current) => new Set(current).add(buildSuggestionKey(field, value)))
  }

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target
    const field = name as keyof CareProfileFormValues
    markUserEdited(field)
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleArrayToggle(field: ArrayFieldName, value: string) {
    markUserEdited(field)
    setFormValues((current) => {
      const normalizedValue = value.trim()

      if (!normalizedValue) {
        return current
      }

      const existingValues = current[field]
      const nextValues = existingValues.includes(normalizedValue)
        ? existingValues.filter((entry) => entry !== normalizedValue)
        : [...existingValues, normalizedValue]

      return {
        ...current,
        [field]: nextValues,
      }
    })
  }

  function acceptSuggestedValue(field: ArrayFieldName, value: string) {
    dismissSuggestion(field, value)
    handleArrayToggle(field, value)
  }

  function rejectSuggestedValue(field: ArrayFieldName, value: string) {
    markUserEdited(field)
    dismissSuggestion(field, value)
  }

  function handlePreferredLanguageToggle(value: string) {
    const normalizedValue = value.trim()

    if (!normalizedValue) {
      return
    }

    markUserEdited("preferredLanguages")
    setFormValues((current) => {
      const exists = current.preferredLanguages.includes(normalizedValue)
      const nextPreferredLanguages = exists
        ? current.preferredLanguages.filter((entry) => entry !== normalizedValue)
        : [...current.preferredLanguages, normalizedValue]
      const nextPrimary =
        current.preferredLanguage === normalizedValue && exists
          ? nextPreferredLanguages[0] ?? ""
          : current.preferredLanguage || normalizedValue

      return {
        ...current,
        preferredLanguages: nextPreferredLanguages,
        preferredLanguage: nextPrimary,
      }
    })
  }

  function handlePreferredPrimaryChange(value: string) {
    markUserEdited("preferredLanguage")
    setFormValues((current) => ({
      ...current,
      preferredLanguage: value,
      preferredLanguages: current.preferredLanguages.includes(value)
        ? current.preferredLanguages
        : [value, ...current.preferredLanguages],
    }))
  }

  async function handleExtractDocuments() {
    if (selectedFiles.length === 0) {
      setExtractionError("Select at least one file first.")
      return
    }

    setIsExtracting(true)
    setExtractionError(null)

    try {
      const extraction = await extractCareProfileFromDocuments({
        files: selectedFiles,
        currentValues: formValues,
      })

      setFormValues((current) => mergeCareProfileExtraction(current, extraction, userEditedFields))
      setFieldReviews(Object.fromEntries(extraction.fieldReviews.map((entry) => [entry.field, entry])))
      setDismissedSuggestions(new Set())
      setHasCompletedExtraction(true)
    } catch (error) {
      setExtractionError(
        error instanceof Error ? error.message : "Failed to extract care profile data.",
      )
    } finally {
      setIsExtracting(false)
    }
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

  if (!isEditing && mode === null) {
    return (
      <section className="page-section care-intake-page-section">
        <section className="care-intake-gate">
          <button className="care-intake-gate-card" onClick={() => setMode("autofill")} type="button">
            <p className="panel-label">Auto-fill path</p>
            <h2>Upload Documents</h2>
          </button>

          <button className="care-intake-gate-card" onClick={() => setMode("manual")} type="button">
            <p className="panel-label">Manual path</p>
            <h2>Enter Manually</h2>
          </button>
        </section>
      </section>
    )
  }

  return (
    <section className="page-section care-intake-page-section">
      {mode === "autofill" && !hasCompletedExtraction && !isEditing ? (
        <section className="care-intake-upload-stage">
          <article className="care-intake-upload-panel">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Upload</p>
                <h2>Document auto-fill</h2>
              </div>
            </div>

            <label className="file-drop-zone care-intake-file-drop-zone">
              <span>Select PDF or image files</span>
              <input
                accept=".pdf,image/*"
                multiple
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                type="file"
              />
            </label>

            <div className="selected-file-list">
              {selectedFiles.length === 0 ? <p className="toolbar-caption">No files selected yet.</p> : null}
              {selectedFiles.map((file) => (
                <article className="upload-file-card" key={`${file.name}-${file.size}`}>
                  <strong>{file.name}</strong>
                  <span>{Math.round(file.size / 1024)} KB</span>
                </article>
              ))}
            </div>

            {isExtracting ? (
              <div className="care-intake-progress-shell" aria-live="polite">
                <div className="care-intake-spinner" aria-hidden="true" />
                <div>
                  <strong>Parsing documents</strong>
                </div>
                <div className="care-intake-progress-bar">
                  <span />
                </div>
              </div>
            ) : null}

            {extractionError ? <p className="field-meta-error">{extractionError}</p> : null}

            <div className="form-actions">
              <Link className="button-secondary" to="/profiles/new">
                Back
              </Link>
              <button
                className="button-primary"
                disabled={isExtracting || selectedFiles.length === 0}
                onClick={() => void handleExtractDocuments()}
                type="button"
              >
                {isExtracting ? "Parsing..." : "Start parsing"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {shouldShowForm ? (
        <section className="editor-stage">
          <form className="editor-canvas form-shell care-intake-form-shell" onSubmit={handleSubmit}>
            <section className="form-section">
              <div className="section-header section-header-tight">
                <div>
                  <p className="panel-label">Basic details</p>
                  <h2>Senior profile essentials</h2>
                </div>
              </div>

              <div className="field-grid">
                <label className={getFieldClassName()}>
                  <span>Name</span>
                  <input name="name" onChange={handleFieldChange} placeholder="e.g. Madam Lim" value={formValues.name} />
                </label>

                <label className={getFieldClassName()}>
                  <span>Age</span>
                  <input inputMode="numeric" name="age" onChange={handleFieldChange} placeholder="e.g. 78" value={formValues.age} />
                </label>

                <label className={getFieldClassName()}>
                  <span>Gender</span>
                  <select name="gender" onChange={handleFieldChange} value={formValues.gender}>
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="form-section">
              <div className="section-header section-header-tight">
                <div>
                  <p className="panel-label">Language</p>
                  <h2>Preferred languages</h2>
                </div>
              </div>

              <FlexibleOptionGroup
                field="preferredLanguages"
                label="Preferred languages"
                options={languageOptions}
                review={fieldReviews.preferredLanguages}
                selectedValues={formValues.preferredLanguages}
                dismissedSuggestions={dismissedSuggestions}
                onAcceptSuggestion={acceptSuggestedValue}
                onRejectSuggestion={rejectSuggestedValue}
                onToggle={handlePreferredLanguageToggle}
              />

              <label className={getFieldClassName()}>
                <span>Primary preferred language</span>
                <select
                  name="preferredLanguage"
                  onChange={(event) => handlePreferredPrimaryChange(event.target.value)}
                  value={formValues.preferredLanguage}
                >
                  <option value="">Select primary language</option>
                  {formValues.preferredLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="form-section">
              <div className="section-header section-header-tight">
                <div>
                  <p className="panel-label">Care needs</p>
                  <h2>Describe the support needed day to day</h2>
                </div>
              </div>

              <FlexibleOptionGroup
                field="conditions"
                label="Conditions"
                options={conditionOptions}
                review={fieldReviews.conditions}
                selectedValues={formValues.conditions}
                dismissedSuggestions={dismissedSuggestions}
                onAcceptSuggestion={acceptSuggestedValue}
                onRejectSuggestion={rejectSuggestedValue}
                onToggle={handleArrayToggle}
              />

              <FlexibleOptionGroup
                field="dailyCareTasks"
                label="Daily care tasks"
                options={dailyCareTaskOptions}
                review={fieldReviews.dailyCareTasks}
                selectedValues={formValues.dailyCareTasks}
                dismissedSuggestions={dismissedSuggestions}
                onAcceptSuggestion={acceptSuggestedValue}
                onRejectSuggestion={rejectSuggestedValue}
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

              <FlexibleOptionGroup
                field="mobilitySupport"
                label="Mobility support"
                options={mobilitySupportOptions}
                review={fieldReviews.mobilitySupport}
                selectedValues={formValues.mobilitySupport}
                dismissedSuggestions={dismissedSuggestions}
                onAcceptSuggestion={acceptSuggestedValue}
                onRejectSuggestion={rejectSuggestedValue}
                onToggle={handleArrayToggle}
              />

              <FlexibleOptionGroup
                field="medicationSupport"
                label="Medication and monitoring"
                options={medicationSupportOptions}
                review={fieldReviews.medicationSupport}
                selectedValues={formValues.medicationSupport}
                dismissedSuggestions={dismissedSuggestions}
                onAcceptSuggestion={acceptSuggestedValue}
                onRejectSuggestion={rejectSuggestedValue}
                onToggle={handleArrayToggle}
              />

              <FlexibleOptionGroup
                field="householdContext"
                label="Household context"
                options={householdContextOptions}
                review={fieldReviews.householdContext}
                selectedValues={formValues.householdContext}
                dismissedSuggestions={dismissedSuggestions}
                onAcceptSuggestion={acceptSuggestedValue}
                onRejectSuggestion={rejectSuggestedValue}
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

              <label className={getFieldClassName()}>
                <span>Risk notes</span>
                <textarea name="riskNotes" onChange={handleFieldChange} placeholder="e.g. Night wandering risk, help needed during transfers." rows={4} value={formValues.riskNotes} />
              </label>

              <label className={getFieldClassName()}>
                <span>Additional notes</span>
                <textarea name="additionalNotes" onChange={handleFieldChange} placeholder="e.g. Family routines, communication preferences, home setup." rows={4} value={formValues.additionalNotes} />
              </label>
            </section>

            <div className="form-actions">
              <Link className="button-secondary" to="/">
                Cancel
              </Link>
              <button className="button-primary" disabled={!canSave || isExtracting} type="submit">
                {isEditing ? "Save changes" : "Save care profile"}
              </button>
            </div>
          </form>

          <aside className="editor-notes summary-panel care-intake-summary-panel">
            <p className="panel-label">Patient profile summary</p>
            <div className="care-intake-summary-fields">
              {summaryItems.map((item) => (
                <div className="care-intake-summary-field" key={item.label}>
                  <span>{item.label}</span>
                  <input readOnly value={item.value} />
                </div>
              ))}
            </div>
          </aside>
        </section>
      ) : null}
    </section>
  )
}

type ArrayFieldName =
  | "preferredLanguages"
  | "conditions"
  | "dailyCareTasks"
  | "mobilitySupport"
  | "medicationSupport"
  | "householdContext"

type FlexibleOptionGroupProps = {
  field: ArrayFieldName
  label: string
  options: CareProfileOption[]
  review?: CareProfileFieldReview
  selectedValues: string[]
  dismissedSuggestions: Set<SuggestionKey>
  onAcceptSuggestion: (field: ArrayFieldName, value: string) => void
  onRejectSuggestion: (field: ArrayFieldName, value: string) => void
  onToggle: (field: ArrayFieldName, value: string) => void
}

function FlexibleOptionGroup({
  field,
  label,
  options,
  review,
  selectedValues,
  dismissedSuggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onToggle,
}: FlexibleOptionGroupProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const normalizedQuery = query.trim()
  const filteredOptions = options.filter((option) => {
    if (selectedValues.includes(option.value)) {
      return false
    }

    return option.label.toLowerCase().includes(normalizedQuery.toLowerCase())
  })
  const canCreate = normalizedQuery.length > 0 && !selectedValues.includes(normalizedQuery)
  const suggestionValues = getPendingSuggestions(field, review, selectedValues, dismissedSuggestions)

  function handleAdd(value: string) {
    onToggle(field, value)
    setQuery("")
    setIsOpen(false)
  }

  return (
    <div className="option-group care-intake-rounded-box">
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && normalizedQuery.length > 0) {
              event.preventDefault()
              handleAdd(normalizedQuery)
            }
          }}
          placeholder="Type to search or create"
          value={query}
        />
        {isOpen && (filteredOptions.length > 0 || canCreate) ? (
          <div className="option-search-results">
            {filteredOptions.slice(0, 6).map((option) => (
              <button className="option-result" key={option.value} onClick={() => handleAdd(option.value)} type="button">
                {option.label}
              </button>
            ))}
            {canCreate ? (
              <button className="option-result option-result-create" onClick={() => handleAdd(normalizedQuery)} type="button">
                Add “{normalizedQuery}”
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedValues.length > 0 ? (
        <div className="option-grid">
          {selectedValues.map((value) => (
            <button className="option-chip option-chip-active" key={value} onClick={() => onToggle(field, value)} type="button">
              {formatDisplayLabel(value)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="option-empty-state">No selections yet.</p>
      )}

      {suggestionValues.length > 0 ? (
        <div className="care-intake-suggestion-block">
          <p className="toolbar-caption">Maybe add:</p>
          <div className="care-intake-suggestion-list">
            {suggestionValues.map((suggestion) => (
              <SuggestionPill
                field={field}
                key={`${field}-${suggestion.value}`}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
                suggestion={suggestion}
              />
            ))}
          </div>
        </div>
      ) : null}

    </div>
  )
}

function getFieldClassName() {
  return "form-field care-intake-rounded-box"
}

function getPendingSuggestions(
  field: ArrayFieldName,
  review: CareProfileFieldReview | undefined,
  selectedValues: string[],
  dismissedSuggestions: Set<SuggestionKey>,
) {
  return (review?.suggestedValues ?? []).filter(
    (suggestion) =>
      suggestion.confidence < HIGH_CONFIDENCE_THRESHOLD &&
      !selectedValues.includes(suggestion.value) &&
      !dismissedSuggestions.has(buildSuggestionKey(field, suggestion.value)),
  )
}

function buildSuggestionKey(field: keyof CareProfileFormValues, value: string): SuggestionKey {
  return `${field}:${value}`
}

function SuggestionPill({
  field,
  suggestion,
  onAccept,
  onReject,
}: {
  field: ArrayFieldName
  suggestion: CareProfileSuggestedValue
  onAccept: (field: ArrayFieldName, value: string) => void
  onReject: (field: ArrayFieldName, value: string) => void
}) {
  return (
    <div className="care-intake-suggestion-pill">
      <button className="option-chip option-chip-suggested" onClick={() => onAccept(field, suggestion.value)} type="button">
        {formatDisplayLabel(suggestion.value)}
      </button>
      <button
        aria-label={`Add ${suggestion.value}`}
        className="care-intake-suggestion-action care-intake-suggestion-action-accept"
        onClick={() => onAccept(field, suggestion.value)}
        type="button"
      >
        ✓
      </button>
      <button
        aria-label={`Reject ${suggestion.value}`}
        className="care-intake-suggestion-action care-intake-suggestion-action-reject"
        onClick={() => onReject(field, suggestion.value)}
        type="button"
      >
        ×
      </button>
    </div>
  )
}
