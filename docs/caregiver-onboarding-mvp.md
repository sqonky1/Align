# Caregiver Onboarding MVP

## Step 1 Scope

This document defines the MVP architecture, shared caregiver schema, extraction pipeline, and UI flow for caregiver onboarding with two entry paths:

1. Upload documents and auto-fill
2. Enter manually

Both paths converge into one caregiver profile draft, one review form, one validation layer, and one submit flow.

## A. Final Architecture

### Textual architecture diagram

```text
[React Caregiver Onboarding UI]
  -> [Mode Gate]
      -> Manual path
      -> Auto-fill path
  -> [Shared Draft Store / local component state]
  -> [Shared Caregiver Form Renderer]
  -> [Shared Validation + field status badges]
  -> [Final Submit]
  -> [localStorage mock persistence now / DB later]

Manual path:
  User enters values directly into shared caregiver draft
  -> validation
  -> review
  -> submit

Auto-fill path:
  User uploads document(s)
  -> POST /api/caregiver-onboarding/extract
  -> file classifier
  -> direct PDF text extraction if digital PDF
  -> Tesseract OCR if scanned PDF/image
  -> extracted raw text per document
  -> OpenAI structured extraction to strict JSON
  -> backend validation + confidence classification
  -> response with draft patch + field evidence + audit record
  -> shared caregiver draft is merged, uncertain fields highlighted
  -> user edits same shared form
  -> submit

Shared backend services:
  /api/caregiver-onboarding/extract
  /api/caregiver-onboarding/validate
  /api/caregiver-onboarding/submit

Audit trail for auto-fill:
  uploaded file metadata
  extracted raw text
  model request version + model name
  extracted JSON
  field confidence
  field evidence snippets
  validation issues
  timestamp
```

### Component and service responsibilities

- `CaregiverOnboardingPage`: route-level container for gate, state orchestration, and submit.
- `ModeSelectionPanel`: two-button entry gate for manual vs auto-fill.
- `CaregiverProfileDraft`: canonical frontend object that both paths mutate.
- `DocumentUploadPanel`: upload docs, call extraction API, show processing status.
- `AutofillReviewPanel`: side-by-side document preview and extracted form review.
- `CaregiverProfileForm`: single reusable form renderer used in both manual and auto-fill modes.
- `FieldReviewState`: metadata per field for confidence, evidence, source doc, validation errors, and confirmation status.
- `Extraction service`: text extraction, OCR fallback, OpenAI mapping, validation, audit capture.
- `Persistence service`: stores final caregiver profile and optionally the auto-fill audit bundle.

### Backend flow details

#### Extract endpoint

`POST /api/caregiver-onboarding/extract`

Input:

- multipart files
- optional current draft to support assist-after-manual-entry

Processing:

- detect MIME/type
- if digital PDF, extract text directly with a free parser
- if scanned PDF or image, render pages if needed and run Tesseract OCR locally
- normalize document text into per-document payloads
- send raw text plus target schema to OpenAI
- parse strict JSON
- run validation and confidence policy
- return draft patch plus review metadata and audit bundle

Output:

- `draft`
- `field_reviews`
- `document_results`
- `audit`
- `validation_issues`

#### Validate endpoint

`POST /api/caregiver-onboarding/validate`

Use cases:

- validate as user edits the form
- revalidate merged results after auto-fill
- keep frontend logic minimal if needed

#### Submit endpoint

`POST /api/caregiver-onboarding/submit`

Input:

- shared caregiver draft
- optional extraction audit reference or payload
- source mode metadata: manual, autofill, or hybrid

Processing:

- final validation
- sanitize strings and dates
- persist profile record
- persist audit data when auto-fill was used

### Low-cost MVP implementation choices

- Direct PDF text extraction: `pdf-parse` or `pdfjs-dist`
- OCR: `tesseract.js`
- Images/PDF page rendering if needed: `pdf-poppler` is avoided for MVP due to system dependency risk; prefer digital PDF direct extraction first, and image upload support immediately. For scanned PDFs, add a Node-side PDF-to-image step only if runtime allows it.
- LLM mapping: existing OpenAI API key via server-side OpenAI SDK
- Persistence: current mock/localStorage pattern for frontend MVP; server audit files can be written locally under `server/data/` later
- Validation: TypeScript module with JSON Schema parity

### Security and compliance notes

- Do not log raw document text, ID numbers, phone numbers, or emails to console.
- Store extraction audit records separately from general app logs.
- At-rest encryption note for MVP: if moved beyond local files/localStorage, store caregiver records and audit payloads in encrypted storage with key management separated from app config.
- Access control note: caregiver onboarding and audit retrieval should be authenticated and role-restricted in production.
- Redaction note: server logs should redact `id_number`, `phone`, `email`, `address`, and emergency contact phone values.

## B. Shared Schema Definitions

The source of truth should be `CaregiverProfileDraft` and related review types in `src/features/caregiverOnboarding/types.ts`.

Design principles:

- one canonical caregiver profile shape for manual and auto-fill paths
- string dates in ISO `YYYY-MM-DD`
- review metadata separate from saved profile values
- field-level confidence represented on flattened field paths
- extraction response can merge onto an existing draft without replacing user-confirmed values blindly

## C. OpenAI Extraction Prompt Strategy

Extraction uses a strict JSON-only response with these rules:

- no markdown
- no prose outside JSON
- no invented values
- `null` for unknown scalars
- empty arrays for unknown list fields
- evidence must quote or closely paraphrase short source snippets from extracted text only
- confidence must be a `0` to `1` number per field
- every field in the target schema must appear in output

Prompt files are defined in `src/features/caregiverOnboarding/prompts.ts`.

## D. UI Flow Spec

### Entry gate

Layout:

- headline explaining two ways to create a caregiver profile
- two large side-by-side buttons on desktop, stacked on mobile
- left: `Upload Documents (Auto-fill)`
- right: `Enter Manually`
- short helper text under each button

Behavior:

- selecting a mode sets `draft.mode`
- no data reset on mode switch
- if a draft already has values, switching modes keeps current values and review metadata

### Manual path

Flow:

1. user clicks `Enter Manually`
2. blank shared form opens
3. user fills fields directly
4. optional secondary action: `Upload documents to assist`
5. upload result merges into current draft without clearing manual edits
6. user reviews highlights and submits

Merge rule:

- user-confirmed fields are not silently overwritten by auto-fill
- medium or low confidence results create suggestions that require review
- high-confidence empty fields may be auto-filled

### Auto-fill path

Flow:

1. user clicks `Upload Documents (Auto-fill)`
2. upload panel opens
3. user uploads one or more supported docs
4. extraction runs and returns draft + field review metadata
5. review screen shows document preview on left and shared form on right
6. high-confidence fields prefill normally
7. medium-confidence fields prefill and highlight
8. low-confidence or invalid fields are flagged and require manual confirmation
9. user edits same shared form and submits

### Path switching without data loss

State model:

- `draft.values`: current caregiver profile values
- `draft.fieldReviews`: per-field review state
- `draft.userEdits`: set of field paths explicitly edited by the user
- `draft.uploads`: document metadata and extraction history
- `draft.mode`: current visible path

Switch rules:

- changing from auto-fill to manual hides preview pane but retains extracted values and review flags
- changing from manual to auto-fill opens upload/review pane with current manual draft preserved
- subsequent extraction attempts merge into draft and record a new extraction timestamp
- reset is only available through an explicit `Start over` action

### Shared final submit flow

1. run final validation on the shared draft
2. block submit if required fields are missing or invalid
3. block submit if low-confidence required fields remain unconfirmed
4. submit one final caregiver profile payload regardless of original path
5. attach audit payload reference when any auto-fill step was used

### Field highlight behavior

- High confidence: standard field styling
- Medium confidence: warning highlight and evidence tooltip
- Low confidence: error highlight, confirmation required
- Invalid value: error state with validation reason
- User-edited after extraction: show as `reviewed`

## Local run/test for Step 1

No runtime behavior changes yet.

Validation for this step:

```bash
npm run build
npm run lint
```

Next implementation step will wire these contracts into actual React screens and API endpoints.

## Proposed Folder Structure

```text
src/
  features/
    caregiverOnboarding/
      api.ts
      draft.ts
      prompts.ts
      storage.ts
      types.ts
      validation.ts
  pages/
    CaregiverOnboardingPage.tsx
server/
  caregiverOnboardingPrompts.js
  caregiverOnboardingSchema.js
  data/
    caregiver-extraction-audit.jsonl
  index.js
docs/
  caregiver-onboarding-mvp.md
  evaluation-checklist.md
  sample-documents/
    caregiver-government-id.txt
    caregiver-certificate.txt
    caregiver-medical-clearance.txt
    caregiver-resume.txt
```

## Backend API Contracts

### `POST /api/caregiver-onboarding/extract`

Request:

- `multipart/form-data`
- `documents`: one or more uploaded files
- `current_draft`: JSON string of current caregiver draft, optional for future merge policy tuning

Success response:

```json
{
  "draft_patch": {
    "caregiver_profile": {
      "full_name": "Maria Santos",
      "date_of_birth": "1987-04-12",
      "nationality": "Filipino",
      "id_number": "P1234567A",
      "phone": "+65 8123 4567",
      "email": "maria@example.com",
      "address": "12 Sample Street, Manila",
      "certifications": [],
      "medical_clearance": {
        "status": "cleared",
        "issue_date": "2026-01-05",
        "expiry_date": "2027-01-05"
      },
      "vaccinations": [],
      "languages": ["English", "Tagalog"],
      "years_experience": 6,
      "emergency_contact": {
        "name": "Ana Santos",
        "phone": "+63 912 000 1111",
        "relationship": "Sister"
      }
    },
    "field_reviews": [],
    "document_results": [],
    "validation_issues": []
  },
  "audit": {
    "extracted_at": "2026-05-09T12:00:00.000Z",
    "model_name": "gpt-5-mini",
    "model_version": null,
    "prompt_version": "2026-05-09.v1",
    "raw_text_by_document": [],
    "extracted_json": {}
  }
}
```

Failure response:

```json
{
  "error": "Document extraction failed."
}
```

### `POST /api/match-reasoning`

Unchanged existing endpoint.

## Validation Rules Module

Implemented in `src/features/caregiverOnboarding/validation.ts`.

Current MVP rules:

- required fields for core identity, phone, address, language, experience, and emergency contact
- ISO date format validation for all date fields
- future-date checks for date of birth and vaccinations
- expiry must not be earlier than issue date
- expired documents marked as warnings
- low-confidence extracted fields block submit until reviewed
- invalid email format blocks submit when email is supplied

## Error and Retry Handling

### OCR failure

- return API error when the document cannot be parsed or OCR fails
- keep current draft intact
- let user retry with a clearer image or a different file

### Malformed model JSON

- first parse raw model output directly
- if parsing fails, extract the outer JSON object and retry parse
- if parsing still fails, run one stricter retry prompt
- if second attempt also fails, return an explicit server error

### Low-confidence or invalid fields

- prefill when possible
- mark field with warning or error state
- block final submit on low-confidence required fields until user review

### Merge safety

- manually edited fields are preserved during auto-fill merge
- auto-fill fills empty fields first
- extracted arrays and section blocks remain reviewable after merge
