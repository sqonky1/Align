# Caregiver Onboarding Evaluation Checklist

## Local Setup

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173/caregivers/new`
- `http://localhost:8787/api/health`

## Manual Path

- Click `Enter Manually`
- Fill required fields
- Save caregiver profile
- Confirm profile appears on the workspace home page
- Switch to `Upload documents to assist` after partial entry and confirm existing values remain

## Auto-fill Path

- Click `Upload Documents (Auto-fill)`
- Upload one or more sample documents from `docs/sample-documents/`
- Confirm extracted values appear in the shared form
- Confirm medium-confidence fields are highlighted
- Confirm low-confidence required fields block submit until reviewed
- Confirm switching to manual mode keeps extracted values and review flags

## Validation Cases

- Remove `full_name` and confirm submit is blocked
- Enter invalid email and confirm validation error
- Set expiry earlier than issue date and confirm validation error
- Use a future birth date and confirm validation error

## Error Handling

- Upload an unsupported file type and confirm a clear error is shown
- Temporarily unset `OPENAI_API_KEY` and confirm extraction fails with server error
- Test a blurry image or empty file and confirm extraction returns a recoverable failure path

## Audit Checks

- After a successful extraction, inspect `server/data/caregiver-extraction-audit.jsonl`
- Confirm each record contains:
  - `raw_text_by_document`
  - `extracted_json`
  - `field_reviews`
  - `extracted_at`
  - `model_name`
  - `prompt_version`
