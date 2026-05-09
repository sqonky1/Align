import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PageHeader } from "../components/layout/PageHeader"
import { uploadCaregiverDocuments } from "../features/caregiverOnboarding/api"
import {
  createEmptyOnboardingDraftState,
  mergeExtractionIntoDraft,
  revalidateDraft,
  updateDraftValue,
} from "../features/caregiverOnboarding/draft"
import {
  clearStoredCaregiverOnboardingDraft,
  getStoredCaregiverOnboardingDraft,
  saveCaregiverOnboardingProfile,
  writeStoredCaregiverOnboardingDraft,
} from "../features/caregiverOnboarding/storage"
import type {
  CaregiverCertification,
  CaregiverOnboardingDraftState,
  ExtractionAuditRecord,
  VaccinationRecord,
} from "../features/caregiverOnboarding/types"
import { caregiverProfileFieldPaths } from "../features/caregiverOnboarding/types"
import {
  getFieldStatusClass,
  isDraftSubmittable,
} from "../features/caregiverOnboarding/validation"

export function CaregiverOnboardingPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<CaregiverOnboardingDraftState>(() => {
    const stored = getStoredCaregiverOnboardingDraft()
    return stored ? revalidateDraft(stored) : createEmptyOnboardingDraftState()
  })
  const [auditRecord, setAuditRecord] = useState<ExtractionAuditRecord | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    writeStoredCaregiverOnboardingDraft(draft)
  }, [draft])

  const previewItems = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [selectedFiles],
  )

  useEffect(() => {
    return () => {
      for (const preview of previewItems) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [previewItems])

  function setMode(mode: "manual" | "autofill") {
    setDraft((current) => ({ ...current, mode }))
  }

  function handleScalarChange(fieldPath: string, value: string) {
    setDraft((current) => updateDraftValue(current, fieldPath, value))
    setSubmitMessage(null)
    setErrorMessage(null)
  }

  function handleLanguagesChange(event: ChangeEvent<HTMLInputElement>) {
    const nextLanguages = event.target.value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)

    setDraft((current) => updateDraftValue(current, "languages", nextLanguages))
  }

  function handleYearsExperienceChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value.trim()
    setDraft((current) =>
      updateDraftValue(
        current,
        "years_experience",
        nextValue.length === 0 ? null : Number(nextValue),
      ),
    )
  }

  function handleCertificationChange(
    index: number,
    field: keyof CaregiverCertification,
    value: string,
  ) {
    const nextCertifications = structuredClone(draft.values.certifications)
    nextCertifications[index] = {
      ...nextCertifications[index],
      [field]: value.trim() || null,
    }
    setDraft((current) => updateDraftValue(current, "certifications", nextCertifications))
  }

  function handleVaccinationChange(index: number, field: keyof VaccinationRecord, value: string) {
    const nextVaccinations = structuredClone(draft.values.vaccinations)
    nextVaccinations[index] = {
      ...nextVaccinations[index],
      [field]: value.trim() || null,
    }
    setDraft((current) => updateDraftValue(current, "vaccinations", nextVaccinations))
  }

  function addCertification() {
    const nextCertifications = [
      ...draft.values.certifications,
      { name: null, number: null, issue_date: null, expiry_date: null },
    ]
    setDraft((current) => updateDraftValue(current, "certifications", nextCertifications))
  }

  function addVaccination() {
    const nextVaccinations = [...draft.values.vaccinations, { name: null, date: null }]
    setDraft((current) => updateDraftValue(current, "vaccinations", nextVaccinations))
  }

  function removeCertification(index: number) {
    const nextCertifications = draft.values.certifications.filter((_, entryIndex) => entryIndex !== index)
    setDraft((current) => updateDraftValue(current, "certifications", nextCertifications))
  }

  function removeVaccination(index: number) {
    const nextVaccinations = draft.values.vaccinations.filter((_, entryIndex) => entryIndex !== index)
    setDraft((current) => updateDraftValue(current, "vaccinations", nextVaccinations))
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)
    setErrorMessage(null)
  }

  async function handleExtract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (selectedFiles.length === 0) {
      setErrorMessage("Select at least one file to extract from.")
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setSubmitMessage(null)

    try {
      const response = await uploadCaregiverDocuments({
        files: selectedFiles,
        currentDraftJson: JSON.stringify(draft.values),
      })

      setDraft((current) => mergeExtractionIntoDraft(current, response.draft_patch, response.audit))
      setAuditRecord(response.audit)
      setMode("autofill")
      setSubmitMessage("Documents processed. Review highlighted fields before submit.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Document extraction failed.")
    } finally {
      setIsUploading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextDraft = revalidateDraft(draft)
    setDraft(nextDraft)

    if (!isDraftSubmittable(nextDraft)) {
      setErrorMessage("Resolve the highlighted fields before submit.")
      return
    }

    saveCaregiverOnboardingProfile({
      values: nextDraft.values,
      source_mode: nextDraft.source_mode,
      audit: auditRecord,
      validation_issues: nextDraft.validation_issues,
    })
    clearStoredCaregiverOnboardingDraft()
    setSubmitMessage("Caregiver profile saved.")
    navigate("/", { replace: false })
  }

  function handleStartOver() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Reset the caregiver onboarding draft?")
      if (!confirmed) {
        return
      }
    }

    clearStoredCaregiverOnboardingDraft()
    setAuditRecord(null)
    setSelectedFiles([])
    setDraft(createEmptyOnboardingDraftState())
    setSubmitMessage(null)
    setErrorMessage(null)
  }

  return (
    <section className="page-section caregiver-onboarding-page">
      <PageHeader
        eyebrow="Caregiver onboarding"
        title="Create one caregiver profile from manual entry or document auto-fill."
        description="Both paths save into the same caregiver schema. You can switch modes at any point without losing draft data."
      />

      <section className="onboarding-mode-gate section-shell">
        <div className="section-header">
          <div>
            <p className="panel-label">Start here</p>
            <h2>Choose how to build the caregiver profile</h2>
          </div>
          <button className="button-secondary" onClick={handleStartOver} type="button">
            Start over
          </button>
        </div>

        <div className="mode-choice-grid">
          <button
            className={`mode-choice-card ${draft.mode === "autofill" ? "mode-choice-card-active" : ""}`}
            onClick={() => setMode("autofill")}
            type="button"
          >
            <span className="panel-label">Auto-fill</span>
            <h3>Upload Documents (Auto-fill)</h3>
            <p>Extract from ID, certs, medical clearance, vaccination records, and CV.</p>
          </button>

          <button
            className={`mode-choice-card ${draft.mode === "manual" ? "mode-choice-card-active" : ""}`}
            onClick={() => setMode("manual")}
            type="button"
          >
            <span className="panel-label">Manual</span>
            <h3>Enter Manually</h3>
            <p>Start with a blank form, then upload supporting documents later if needed.</p>
          </button>
        </div>
      </section>

      <section className="onboarding-workbench">
        <div className="onboarding-side-column">
          <form className="section-shell upload-shell" onSubmit={handleExtract}>
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Assist</p>
                <h2>{draft.mode === "autofill" ? "Upload caregiver documents" : "Upload documents to assist"}</h2>
              </div>
            </div>

            <label className="file-drop-zone">
              <span>Select PDF or image files</span>
              <small>Supported: government ID, license/cert, vaccination or medical clearance, resume.</small>
              <input accept=".pdf,image/*" multiple onChange={handleFileSelection} type="file" />
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

            <div className="form-actions form-actions-inline">
              <button className="button-primary" disabled={isUploading || selectedFiles.length === 0} type="submit">
                {isUploading ? "Processing..." : "Run auto-fill"}
              </button>
              <span className="toolbar-caption">Manual inputs stay preserved during merge.</span>
            </div>
          </form>

          <section className="section-shell document-preview-shell">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Review pane</p>
                <h2>Document preview and extraction audit</h2>
              </div>
            </div>

            <div className="document-preview-stack">
              {previewItems.length === 0 && draft.uploads.length === 0 ? (
                <p className="toolbar-caption">Uploaded documents will appear here for side-by-side review.</p>
              ) : null}

              {previewItems.map((preview) => (
                <article className="document-preview-card" key={preview.url}>
                  <header>
                    <strong>{preview.file.name}</strong>
                    <span>{preview.file.type || "file"}</span>
                  </header>
                  {preview.file.type.startsWith("image/") ? (
                    <img alt={preview.file.name} src={preview.url} />
                  ) : (
                    <iframe src={preview.url} title={preview.file.name} />
                  )}
                </article>
              ))}

              {draft.uploads.map((document) => (
                <article className="document-audit-card" key={document.document_id}>
                  <header>
                    <strong>{document.file_name}</strong>
                    <span>{document.extraction_method}</span>
                  </header>
                  <p className="toolbar-caption">{document.document_kind}</p>
                  <pre>{document.raw_text.slice(0, 500) || "No text extracted."}</pre>
                </article>
              ))}
            </div>
          </section>
        </div>

        <form className="editor-canvas form-shell caregiver-onboarding-form" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Shared profile</p>
                <h2>Caregiver details</h2>
              </div>
              <div className="review-legend">
                <span className="review-chip review-chip-medium">Medium confidence</span>
                <span className="review-chip review-chip-low">Needs confirmation</span>
                <span className="review-chip review-chip-reviewed">Reviewed</span>
              </div>
            </div>

            <div className="field-grid onboarding-field-grid">
              <Field
                fieldPath="full_name"
                label="Full name"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.full_name ?? ""}
              />
              <Field
                fieldPath="date_of_birth"
                label="Date of birth"
                draft={draft}
                onChange={handleScalarChange}
                type="date"
                value={draft.values.date_of_birth ?? ""}
              />
              <Field
                fieldPath="nationality"
                label="Nationality"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.nationality ?? ""}
              />
              <Field
                fieldPath="id_number"
                label="ID number"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.id_number ?? ""}
              />
              <Field
                fieldPath="phone"
                label="Phone"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.phone ?? ""}
              />
              <Field
                fieldPath="email"
                label="Email"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.email ?? ""}
              />
              <Field
                fieldPath="address"
                label="Address"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.address ?? ""}
              />
              <label className={`form-field ${getFieldStatusClass(draft, "languages")}`}>
                <span>Languages</span>
                <input onChange={handleLanguagesChange} placeholder="English, Mandarin" value={draft.values.languages.join(", ")} />
                <FieldMeta draft={draft} fieldPath="languages" />
              </label>
              <label className={`form-field ${getFieldStatusClass(draft, "years_experience")}`}>
                <span>Years of experience</span>
                <input inputMode="numeric" onChange={handleYearsExperienceChange} value={draft.values.years_experience ?? ""} />
                <FieldMeta draft={draft} fieldPath="years_experience" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Certifications</p>
                <h2>License and training records</h2>
              </div>
              <button className="button-secondary" onClick={addCertification} type="button">
                Add certification
              </button>
            </div>

            <div className={`repeater-shell ${getFieldStatusClass(draft, "certifications")}`}>
              {draft.values.certifications.length === 0 ? <p className="toolbar-caption">No certifications added yet.</p> : null}
              {draft.values.certifications.map((certification, index) => (
                <article className="repeater-card" key={`cert-${index}`}>
                  <div className="field-grid onboarding-field-grid">
                    <label className="form-field">
                      <span>Name</span>
                      <input onChange={(event) => handleCertificationChange(index, "name", event.target.value)} value={certification.name ?? ""} />
                    </label>
                    <label className="form-field">
                      <span>Number</span>
                      <input onChange={(event) => handleCertificationChange(index, "number", event.target.value)} value={certification.number ?? ""} />
                    </label>
                    <label className="form-field">
                      <span>Issue date</span>
                      <input onChange={(event) => handleCertificationChange(index, "issue_date", event.target.value)} type="date" value={certification.issue_date ?? ""} />
                    </label>
                    <label className="form-field">
                      <span>Expiry date</span>
                      <input onChange={(event) => handleCertificationChange(index, "expiry_date", event.target.value)} type="date" value={certification.expiry_date ?? ""} />
                    </label>
                  </div>
                  <button className="button-secondary" onClick={() => removeCertification(index)} type="button">
                    Remove
                  </button>
                </article>
              ))}
              <FieldMeta draft={draft} fieldPath="certifications" />
            </div>
          </section>

          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Medical</p>
                <h2>Medical clearance and vaccinations</h2>
              </div>
              <button className="button-secondary" onClick={addVaccination} type="button">
                Add vaccination
              </button>
            </div>

            <div className="field-grid onboarding-field-grid">
              <Field
                fieldPath="medical_clearance.status"
                label="Medical clearance status"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.medical_clearance.status ?? ""}
              />
              <Field
                fieldPath="medical_clearance.issue_date"
                label="Medical clearance issue date"
                draft={draft}
                onChange={handleScalarChange}
                type="date"
                value={draft.values.medical_clearance.issue_date ?? ""}
              />
              <Field
                fieldPath="medical_clearance.expiry_date"
                label="Medical clearance expiry date"
                draft={draft}
                onChange={handleScalarChange}
                type="date"
                value={draft.values.medical_clearance.expiry_date ?? ""}
              />
            </div>

            <div className={`repeater-shell ${getFieldStatusClass(draft, "vaccinations")}`}>
              {draft.values.vaccinations.length === 0 ? <p className="toolbar-caption">No vaccinations added yet.</p> : null}
              {draft.values.vaccinations.map((vaccination, index) => (
                <article className="repeater-card" key={`vacc-${index}`}>
                  <div className="field-grid onboarding-field-grid">
                    <label className="form-field">
                      <span>Name</span>
                      <input onChange={(event) => handleVaccinationChange(index, "name", event.target.value)} value={vaccination.name ?? ""} />
                    </label>
                    <label className="form-field">
                      <span>Date</span>
                      <input onChange={(event) => handleVaccinationChange(index, "date", event.target.value)} type="date" value={vaccination.date ?? ""} />
                    </label>
                  </div>
                  <button className="button-secondary" onClick={() => removeVaccination(index)} type="button">
                    Remove
                  </button>
                </article>
              ))}
              <FieldMeta draft={draft} fieldPath="vaccinations" />
            </div>
          </section>

          <section className="form-section">
            <div className="section-header section-header-tight">
              <div>
                <p className="panel-label">Emergency contact</p>
                <h2>Final contact details</h2>
              </div>
            </div>

            <div className="field-grid onboarding-field-grid">
              <Field
                fieldPath="emergency_contact.name"
                label="Emergency contact name"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.emergency_contact.name ?? ""}
              />
              <Field
                fieldPath="emergency_contact.phone"
                label="Emergency contact phone"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.emergency_contact.phone ?? ""}
              />
              <Field
                fieldPath="emergency_contact.relationship"
                label="Emergency contact relationship"
                draft={draft}
                onChange={handleScalarChange}
                value={draft.values.emergency_contact.relationship ?? ""}
              />
            </div>
          </section>

          <section className="section-shell inline-status-shell">
            {errorMessage ? <p className="status-note status-note-error">{errorMessage}</p> : null}
            {submitMessage ? <p className="status-note status-note-success">{submitMessage}</p> : null}

            {draft.validation_issues.length > 0 ? (
              <div className="validation-summary">
                <p className="panel-label">Validation</p>
                {draft.validation_issues.map((issue) => (
                  <p key={`${issue.field_path}-${issue.code}-${issue.message}`}>{issue.field_path}: {issue.message}</p>
                ))}
              </div>
            ) : (
              <p className="toolbar-caption">No validation issues. This draft is ready to submit.</p>
            )}
          </section>

          <div className="form-actions">
            <Link className="button-secondary" to="/">
              Cancel
            </Link>
            <button className="button-primary" type="submit">
              Save caregiver profile
            </button>
          </div>
        </form>
      </section>
    </section>
  )
}

type FieldProps = {
  draft: CaregiverOnboardingDraftState
  fieldPath: (typeof caregiverProfileFieldPaths)[number]
  label: string
  onChange: (fieldPath: string, value: string) => void
  value: string | number
  type?: string
}

function Field({ draft, fieldPath, label, onChange, value, type = "text" }: FieldProps) {
  return (
    <label className={`form-field ${getFieldStatusClass(draft, fieldPath)}`}>
      <span>{label}</span>
      <input onChange={(event) => onChange(fieldPath, event.target.value)} type={type} value={value} />
      <FieldMeta draft={draft} fieldPath={fieldPath} />
    </label>
  )
}

function FieldMeta({
  draft,
  fieldPath,
}: {
  draft: CaregiverOnboardingDraftState
  fieldPath: (typeof caregiverProfileFieldPaths)[number]
}) {
  const review = draft.field_reviews[fieldPath]
  const issues = draft.validation_issues.filter((issue) => issue.field_path === fieldPath)

  if (!review && issues.length === 0) {
    return null
  }

  return (
    <div className="field-meta-stack">
      {review ? (
        <p className="toolbar-caption">
          Confidence {Math.round(review.confidence * 100)}%.
          {review.evidence[0] ? ` Evidence: ${review.evidence[0].snippet}` : ""}
        </p>
      ) : null}
      {issues.map((issue) => (
        <p className={`toolbar-caption ${issue.severity === "error" ? "field-meta-error" : "field-meta-warning"}`} key={`${fieldPath}-${issue.code}-${issue.message}`}>
          {issue.message}
        </p>
      ))}
    </div>
  )
}
