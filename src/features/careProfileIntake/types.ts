import type { CareProfileFormValues } from "../../types"
import type { CareProfileFieldReview } from "./api"

export type CareProfileCreationMode = "manual" | "autofill"

export type CareProfileReviewState = {
  mode: CareProfileCreationMode
  fieldReviews: Partial<Record<keyof CareProfileFormValues, CareProfileFieldReview>>
  selectedFiles: File[]
  isExtracting: boolean
  extractionError: string | null
}
