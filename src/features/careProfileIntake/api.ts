import type { CareProfileFormValues } from "../../types"

export type CareProfileFieldPath = keyof CareProfileFormValues

export type CareProfileSuggestedValue = {
  value: string
  confidence: number
  evidence: string[]
}

export type CareProfileFieldReview = {
  field: CareProfileFieldPath
  confidence: number
  evidence: string[]
  issues: string[]
  suggestedValues: CareProfileSuggestedValue[]
}

export type CareProfileExtractionResponse = {
  values: CareProfileFormValues
  fieldReviews: CareProfileFieldReview[]
}

export async function extractCareProfileFromDocuments(input: {
  files: File[]
  currentValues: CareProfileFormValues
}) {
  const formData = new FormData()

  for (const file of input.files) {
    formData.append("documents", file)
  }

  formData.append("currentValues", JSON.stringify(input.currentValues))

  const response = await fetch("/api/care-profile-extract", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? "Failed to extract care profile data.")
  }

  return (await response.json()) as CareProfileExtractionResponse
}
