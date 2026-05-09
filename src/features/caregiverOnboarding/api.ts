import type { CaregiverExtractionResult, ExtractionAuditRecord } from "./types"

export type ExtractionApiResponse = {
  draft_patch: CaregiverExtractionResult
  audit: ExtractionAuditRecord | null
}

export async function uploadCaregiverDocuments(input: {
  files: File[]
  currentDraftJson: string
}) {
  const formData = new FormData()

  for (const file of input.files) {
    formData.append("documents", file)
  }

  formData.append("current_draft", input.currentDraftJson)

  const response = await fetch("/api/caregiver-onboarding/extract", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? "Document extraction failed.")
  }

  return (await response.json()) as ExtractionApiResponse
}
