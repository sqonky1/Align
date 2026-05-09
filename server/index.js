import { appendFile, mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import multer from "multer"
import OpenAI from "openai"
import { PDFParse } from "pdf-parse"
import Ajv from "ajv"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas"
import { createWorker } from "tesseract.js"
import {
  CAREGIVER_EXTRACTION_PROMPT_VERSION,
  buildCaregiverExtractionUserPrompt,
  caregiverExtractionSystemPrompt,
} from "./caregiverOnboardingPrompts.js"
import { caregiverExtractionResultJsonSchema, caregiverProfileFieldPaths } from "./caregiverOnboardingSchema.js"

globalThis.DOMMatrix = DOMMatrix
globalThis.ImageData = ImageData
globalThis.Path2D = Path2D

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } })
const port = Number(process.env.PORT ?? 8787)
const model = process.env.OPENAI_MODEL ?? "gpt-5.2"
const apiKey = process.env.OPENAI_API_KEY
const app = express()
const cache = new Map()
const openai = new OpenAI({ apiKey })
const ajv = new Ajv({ allErrors: true, strict: false })
const validateExtractionResult = ajv.compile(caregiverExtractionResultJsonSchema)
const auditDirectory = path.join(__dirname, "data")
const auditFilePath = path.join(auditDirectory, "caregiver-extraction-audit.jsonl")
const careProfileMvpArrayOptions = {
  preferredLanguages: ["English", "Mandarin", "Hokkien"],
  conditions: ["anaemia", "diabetes", "hypertension"],
  dailyCareTasks: [],
  mobilitySupport: ["fall_risk_monitoring"],
  medicationSupport: [
    "medication_reminders",
    "blood_glucose_monitoring",
    "blood_pressure_monitoring",
  ],
  householdContext: [],
}

if (!apiKey) {
  console.warn("OPENAI_API_KEY is missing. Extraction requests will fail until it is set.")
}

app.use(express.json({ limit: "1mb" }))

app.get("/api/health", (_request, response) => {
  response.json({ ok: true })
})

app.post("/api/match-reasoning", async (request, response) => {
  if (!apiKey) {
    response.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." })
    return
  }

  const { caregiver, matchPercent, profile, breakdown, summary, alert } = request.body ?? {}

  if (!profile?.id || !caregiver?.id || !Array.isArray(breakdown) || typeof matchPercent !== "number") {
    response.status(400).json({ error: "Invalid request payload." })
    return
  }

  const cacheKey = `${profile.id}:${caregiver.id}`
  const cachedReasoning = cache.get(cacheKey)

  if (cachedReasoning) {
    response.json({ reasoning: cachedReasoning, cached: true })
    return
  }

  try {
    const reasoning = await generateMatchReasoning({
      caregiver,
      matchPercent,
      profile,
      breakdown,
      summary,
      alert,
      model,
      openai,
    })

    cache.set(cacheKey, reasoning)
    response.json({ reasoning, cached: false })
  } catch {
    response.status(500).json({ error: "Failed to generate match reasoning." })
  }
})

app.post(
  "/api/caregiver-onboarding/extract",
  upload.array("documents", 8),
  async (request, response) => {
    if (!apiKey) {
      response.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." })
      return
    }

    const files = Array.isArray(request.files) ? request.files : []

    if (files.length === 0) {
      response.status(400).json({ error: "No documents were uploaded." })
      return
    }

    try {
      const extractedDocuments = await Promise.all(files.map(extractDocumentResult))
      const modelResult = await extractCaregiverProfile(extractedDocuments)
      const draftPatch = normalizeExtractionResult(modelResult, extractedDocuments)
      const validationIssues = buildValidationIssues(draftPatch)
      draftPatch.validation_issues = dedupeIssues([
        ...draftPatch.validation_issues,
        ...validationIssues,
      ])

      const audit = {
        extracted_at: new Date().toISOString(),
        model_name: model,
        model_version: null,
        prompt_version: CAREGIVER_EXTRACTION_PROMPT_VERSION,
        raw_text_by_document: extractedDocuments.map((document) => ({
          document_id: document.document_id,
          raw_text: document.raw_text,
        })),
        extracted_json: draftPatch,
      }

      await appendExtractionAuditRecord(audit)

      response.json({
        draft_patch: draftPatch,
        audit,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed."
      response.status(500).json({ error: message })
    }
  },
)


app.post(
  "/api/care-profile-extract",
  upload.array("documents", 8),
  async (request, response) => {
    if (!apiKey) {
      response.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." })
      return
    }

    const files = Array.isArray(request.files) ? request.files : []

    if (files.length === 0) {
      response.status(400).json({ error: "No documents were uploaded." })
      return
    }

    try {
      const extractedDocuments = await Promise.all(files.map(extractDocumentResult))
      const extraction = await extractCareProfileFromDocuments(extractedDocuments)
      response.json(extraction)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to extract care profile data."
      response.status(500).json({ error: message })
    }
  },
)

app.listen(port, () => {
  console.log(`Align API listening on http://localhost:${port}`)
})

async function generateMatchReasoning({
  caregiver,
  matchPercent,
  profile,
  breakdown,
  summary,
  alert,
  model,
  openai,
}) {
  const response = await openai.responses.create({
    model,
    instructions: [
      "You explain a helper match for an employer reviewing a senior-care profile.",
      "Use only the provided JSON.",
      "Do not invent training, risks, medical claims, or experience.",
      "Keep the explanation to 2 or 3 sentences.",
      "Start with the strongest fit factors.",
      "Mention at most one practical caution if there is a real gap.",
      "Keep the tone practical, specific, and non-clinical.",
    ].join(" "),
    input: JSON.stringify({
      caregiver: {
        id: caregiver.id,
        name: caregiver.name,
        agencyName: caregiver.agencyName,
        languages: caregiver.languages,
        yearsOfExperience: caregiver.yearsOfExperience,
        careConditions: caregiver.careConditions,
        careTasks: caregiver.careTasks,
        mobilitySkills: caregiver.mobilitySkills,
        medicationSkills: caregiver.medicationSkills,
        training: caregiver.training,
        certifications: caregiver.certifications,
      },
      profile: {
        id: profile.id,
        name: profile.name,
        preferredLanguage: profile.preferredLanguage,
        conditions: profile.conditions,
        dailyCareTasks: profile.dailyCareTasks,
        mobilitySupport: profile.mobilitySupport,
        medicationSupport: profile.medicationSupport,
        riskNotes: profile.riskNotes,
        additionalNotes: profile.additionalNotes,
      },
      matchPercent,
      breakdown,
      fallbackSummary: summary,
      fallbackAlert: alert,
    }),
  })

  const reasoning = response.output_text?.trim()

  if (!reasoning) {
    throw new Error("OpenAI response did not include output text.")
  }

  return reasoning
}

async function extractDocumentResult(file) {
  const documentId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (file.mimetype === "application/pdf") {
    const directText = await extractPdfText(file.buffer)

    if (directText.trim().length >= 40) {
      return {
        document_id: documentId,
        file_name: file.originalname,
        document_kind: inferDocumentKind(file.originalname, directText),
        mime_type: file.mimetype,
        extraction_method: "direct_pdf_text",
        raw_text: directText,
        raw_text_char_count: directText.length,
      }
    }

    const ocrText = await ocrPdf(file.buffer)

    return {
      document_id: documentId,
      file_name: file.originalname,
      document_kind: inferDocumentKind(file.originalname, ocrText),
      mime_type: file.mimetype,
      extraction_method: "ocr_pdf",
      raw_text: ocrText,
      raw_text_char_count: ocrText.length,
    }
  }

  if (file.mimetype.startsWith("image/")) {
    const rawText = await ocrImage(file.buffer)

    return {
      document_id: documentId,
      file_name: file.originalname,
      document_kind: inferDocumentKind(file.originalname, rawText),
      mime_type: file.mimetype,
      extraction_method: "ocr_image",
      raw_text: rawText,
      raw_text_char_count: rawText.length,
    }
  }

  throw new Error(`Unsupported file type: ${file.mimetype || file.originalname}`)
}

async function extractCaregiverProfile(extractedDocuments) {
  const response = await openai.responses.create({
    model,
    instructions: caregiverExtractionSystemPrompt,
    input: buildCaregiverExtractionUserPrompt(extractedDocuments),
  })

  const rawOutput = response.output_text?.trim()

  if (!rawOutput) {
    throw new Error("The extraction model returned an empty response.")
  }

  try {
    return JSON.parse(rawOutput)
  } catch {
    const repaired = extractJsonObject(rawOutput)

    if (repaired) {
      return JSON.parse(repaired)
    }
  }

  const retryResponse = await openai.responses.create({
    model,
    instructions: `${caregiverExtractionSystemPrompt} Return valid JSON matching the schema with no surrounding text.`,
    input: buildCaregiverExtractionUserPrompt(extractedDocuments),
  })
  const retryOutput = retryResponse.output_text?.trim() ?? ""

  try {
    return JSON.parse(retryOutput)
  } catch {
    const repaired = extractJsonObject(retryOutput)

    if (!repaired) {
      throw new Error("The extraction model returned malformed JSON twice.")
    }

    return JSON.parse(repaired)
  }
}

function normalizeExtractionResult(modelResult, extractedDocuments) {
  const normalized = {
    caregiver_profile: modelResult.caregiver_profile,
    field_reviews: Array.isArray(modelResult.field_reviews) ? modelResult.field_reviews : [],
    document_results: extractedDocuments,
    validation_issues: Array.isArray(modelResult.validation_issues)
      ? modelResult.validation_issues
      : [],
  }

  normalized.field_reviews = caregiverProfileFieldPaths.map((fieldPath) => {
    const review = normalized.field_reviews.find((entry) => entry.field_path === fieldPath)
    const fallbackValue = getValueFromProfile(normalized.caregiver_profile, fieldPath)
    const confidence = clampConfidence(review?.confidence)

    return {
      field_path: fieldPath,
      value: review?.value ?? fallbackValue,
      confidence,
      confidence_band: classifyConfidenceBand(confidence),
      evidence: Array.isArray(review?.evidence) ? review.evidence : [],
      issues: Array.isArray(review?.issues) ? review.issues : [],
      requires_confirmation:
        review?.requires_confirmation ?? (confidence < 0.6 || (review?.issues?.length ?? 0) > 0),
      reviewed: Boolean(review?.reviewed),
      source_mode: "autofill",
    }
  })

  if (!validateExtractionResult(normalized)) {
    throw new Error("Extraction result did not match the required schema.")
  }

  return normalized
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer })

  try {
    const parsed = await parser.getText()
    return parsed.text?.replace(/\s+\n/g, "\n").trim() ?? ""
  } finally {
    await parser.destroy()
  }
}

async function ocrImage(buffer) {
  const worker = await createWorker("eng")

  try {
    const result = await worker.recognize(buffer)
    return result.data.text.trim()
  } finally {
    await worker.terminate()
  }
}

async function ocrPdf(buffer) {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise
  const pages = []

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext("2d")

    await page.render({ canvasContext: context, viewport }).promise
    const pngBuffer = canvas.toBuffer("image/png")
    const text = await ocrImage(pngBuffer)
    pages.push(text)
  }

  return pages.join("\n\n").trim()
}

function inferDocumentKind(fileName, rawText) {
  const haystack = `${fileName} ${rawText}`.toLowerCase()

  if (/(passport|permit|identity|identification|national id)/.test(haystack)) {
    return "government_id"
  }

  if (/(certificate|certification|license|licence)/.test(haystack)) {
    return "caregiver_certificate"
  }

  if (/(medical clearance|fit to work|medical fitness|health screening)/.test(haystack)) {
    return "medical_clearance"
  }

  if (/(vaccin|immuni)/.test(haystack)) {
    return "vaccination_record"
  }

  if (/(resume|curriculum vitae|cv|experience)/.test(haystack)) {
    return "resume"
  }

  return "unknown"
}

function buildValidationIssues(draftPatch) {
  const issues = []
  const profile = draftPatch.caregiver_profile

  for (const fieldPath of [
    "full_name",
    "date_of_birth",
    "nationality",
    "id_number",
    "phone",
    "address",
    "languages",
    "years_experience",
  ]) {
    const value = getValueFromProfile(profile, fieldPath)
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      issues.push({
        field_path: fieldPath,
        code: "required",
        message: "This field is required before submit.",
        severity: "error",
      })
    }
  }

  const dateFields = [
    ["date_of_birth", profile.date_of_birth, false],
    ["medical_clearance.issue_date", profile.medical_clearance.issue_date, true],
    ["medical_clearance.expiry_date", profile.medical_clearance.expiry_date, true],
  ]

  for (const [fieldPath, value, allowFuture] of dateFields) {
    validateDateValue(fieldPath, value, issues, allowFuture)
  }

  for (const review of draftPatch.field_reviews) {
    if (review.confidence < 0.6) {
      issues.push({
        field_path: review.field_path,
        code: "low_confidence",
        message: "Low-confidence field requires confirmation.",
        severity: "error",
      })
    }
  }

  return issues
}

function validateDateValue(fieldPath, value, issues, allowFuture) {
  if (!value) {
    return
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    issues.push({
      field_path: fieldPath,
      code: "invalid_date",
      message: "Date must use YYYY-MM-DD.",
      severity: "error",
    })
    return
  }

  if (allowFuture === false && Date.parse(value) > Date.now()) {
    issues.push({
      field_path: fieldPath,
      code: "future_date",
      message: "Future dates are not allowed here.",
      severity: "error",
    })
  }
}

function getValueFromProfile(profile, fieldPath) {
  switch (fieldPath) {
    case "full_name":
      return profile.full_name
    case "date_of_birth":
      return profile.date_of_birth
    case "nationality":
      return profile.nationality
    case "id_number":
      return profile.id_number
    case "phone":
      return profile.phone
    case "email":
      return profile.email
    case "address":
      return profile.address
    case "certifications":
      return profile.certifications
    case "medical_clearance.status":
      return profile.medical_clearance.status
    case "medical_clearance.issue_date":
      return profile.medical_clearance.issue_date
    case "medical_clearance.expiry_date":
      return profile.medical_clearance.expiry_date
    case "vaccinations":
      return profile.vaccinations
    case "languages":
      return profile.languages
    case "years_experience":
      return profile.years_experience
    case "emergency_contact.name":
      return profile.emergency_contact.name
    case "emergency_contact.phone":
      return profile.emergency_contact.phone
    case "emergency_contact.relationship":
      return profile.emergency_contact.relationship
    default:
      return null
  }
}

function classifyConfidenceBand(confidence) {
  if (confidence >= 0.85) {
    return "high"
  }

  if (confidence >= 0.6) {
    return "medium"
  }

  return "low"
}

function clampConfidence(confidence) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return 0
  }

  return Math.max(0, Math.min(1, confidence))
}

function dedupeIssues(issues) {
  const seen = new Set()

  return issues.filter((issue) => {
    const key = `${issue.field_path}:${issue.code}:${issue.message}:${issue.severity}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function extractJsonObject(value) {
  const start = value.indexOf("{")
  const end = value.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  return value.slice(start, end + 1)
}

async function appendExtractionAuditRecord(audit) {
  await mkdir(auditDirectory, { recursive: true })
  await appendFile(auditFilePath, `${JSON.stringify(audit)}\n`, "utf8")
}


async function extractCareProfileFromDocuments(extractedDocuments) {
  const prompt = [
    "You extract care recipient profile data from medical notes, reports, and care assessments.",
    "This MVP parser is for a simple chronic-care patient profile used to match domestic helpers, not to build a full clinical chart.",
    "Return JSON only.",
    "Do not include markdown.",
    "Use only the supplied text.",
    "Map only to the exact schema fields provided.",
    "If a value is unknown, use an empty string for scalar fields and [] for arrays.",
    "For name use the care recipient name, not the helper or doctor.",
    "For age return digits only as a string.",
    "For gender use male, female, or empty string.",
    "preferredLanguages can contain one or more languages or dialects mentioned in the documents, but only from the allowed options.",
    "preferredLanguage should be the primary language among preferredLanguages when explicit; otherwise leave it empty.",
    "For structured care arrays, never invent new labels. Choose only from the allowed options supplied for each field.",
    "Use conditions only for chronic conditions relevant to helper matching.",
    "Keep dailyCareTasks empty unless the document explicitly states repeated caregiver-run ADL support tasks.",
    "Use mobilitySupport only when there is a clear helper-relevant mobility or fall-monitoring need from the text.",
    "Use medicationSupport only for helper-relevant routines like reminders or basic monitoring, not for medication names or clinical treatment plans.",
    "Keep householdContext empty unless one of the allowed home-context options is explicitly stated.",
    "Put uncertain or clinical narrative details into riskNotes or additionalNotes instead of inventing structured values.",
    "For fieldReviews, include one entry per field with confidence 0 to 1, short evidence snippets, issues when uncertain, and suggestedValues for array fields when item-level confidence differs.",
  ].join(" ")

  const responseSchema = {
    type: "object",
    additionalProperties: false,
    required: ["values", "fieldReviews"],
    properties: {
      values: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "age",
          "gender",
          "preferredLanguage",
          "preferredLanguages",
          "conditions",
          "dailyCareTasks",
          "mobilitySupport",
          "medicationSupport",
          "householdContext",
          "riskNotes",
          "additionalNotes",
        ],
        properties: {
          name: { type: "string" },
          age: { type: "string" },
          gender: { type: "string", enum: ["", "male", "female"] },
          preferredLanguage: { type: "string" },
          preferredLanguages: buildEnumArraySchema(careProfileMvpArrayOptions.preferredLanguages),
          conditions: buildEnumArraySchema(careProfileMvpArrayOptions.conditions),
          dailyCareTasks: { type: "array", items: { type: "string" } },
          mobilitySupport: buildEnumArraySchema(careProfileMvpArrayOptions.mobilitySupport),
          medicationSupport: buildEnumArraySchema(careProfileMvpArrayOptions.medicationSupport),
          householdContext: { type: "array", items: { type: "string" } },
          riskNotes: { type: "string" },
          additionalNotes: { type: "string" },
        },
      },
      fieldReviews: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["field", "confidence", "evidence", "issues"],
          properties: {
            field: { type: "string", enum: ["name", "age", "gender", "preferredLanguage", "preferredLanguages", "conditions", "dailyCareTasks", "mobilitySupport", "medicationSupport", "householdContext", "riskNotes", "additionalNotes"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            evidence: { type: "array", items: { type: "string" } },
            issues: { type: "array", items: { type: "string" } },
            suggestedValues: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["value", "confidence", "evidence"],
                properties: {
                  value: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  evidence: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  }

  const llmResponse = await openai.responses.create({
    model,
    instructions: prompt,
    input: JSON.stringify({
      responseSchema,
      allowedOptions: careProfileMvpArrayOptions,
      documents: extractedDocuments,
    }),
  })

  const rawOutput = llmResponse.output_text?.trim()

  if (!rawOutput) {
    throw new Error("The extraction model returned an empty response.")
  }

  let parsed

  try {
    parsed = JSON.parse(rawOutput)
  } catch {
    const repaired = extractJsonObject(rawOutput)

    if (!repaired) {
      throw new Error("The extraction model returned malformed JSON.")
    }

    parsed = JSON.parse(repaired)
  }

  return normalizeCareProfileExtraction(parsed)
}

function normalizeCareProfileExtraction(modelResult) {
  const emptyValues = {
    name: "",
    age: "",
    gender: "",
    preferredLanguage: "",
    preferredLanguages: [],
    conditions: [],
    dailyCareTasks: [],
    mobilitySupport: [],
    medicationSupport: [],
    householdContext: [],
    riskNotes: "",
    additionalNotes: "",
  }

  const values = {
    ...emptyValues,
    ...(modelResult?.values ?? {}),
  }

  const fieldNames = Object.keys(emptyValues)
  const fieldReviews = fieldNames.map((field) => {
    const review = Array.isArray(modelResult?.fieldReviews)
      ? modelResult.fieldReviews.find((entry) => entry.field === field)
      : null

    return {
      field,
      confidence: clampConfidence(review?.confidence),
      evidence: Array.isArray(review?.evidence) ? review.evidence.slice(0, 3) : [],
      issues: Array.isArray(review?.issues) ? review.issues : [],
      suggestedValues: Array.isArray(review?.suggestedValues)
        ? review.suggestedValues
            .filter((entry) => typeof entry?.value === "string" && entry.value.trim().length > 0)
            .map((entry) => ({
              value: entry.value.trim(),
              confidence: clampConfidence(entry.confidence),
              evidence: Array.isArray(entry.evidence) ? entry.evidence.slice(0, 2) : [],
            }))
        : [],
    }
  })

  values.gender = values.gender === "male" || values.gender === "female" ? values.gender : ""
  values.preferredLanguages = sanitizeTextValues("preferredLanguages", values.preferredLanguages)
  values.preferredLanguage = typeof values.preferredLanguage === "string" ? values.preferredLanguage.trim() : ""
  if (!values.preferredLanguage && values.preferredLanguages.length > 0) {
    values.preferredLanguage = values.preferredLanguages[0]
  }
  if (!careProfileMvpArrayOptions.preferredLanguages.includes(values.preferredLanguage)) {
    values.preferredLanguage = values.preferredLanguages[0] ?? ""
  }
  values.conditions = sanitizeTextValues("conditions", values.conditions)
  values.dailyCareTasks = sanitizeTextValues("dailyCareTasks", values.dailyCareTasks)
  values.mobilitySupport = sanitizeTextValues("mobilitySupport", values.mobilitySupport)
  values.medicationSupport = sanitizeTextValues("medicationSupport", values.medicationSupport)
  values.householdContext = sanitizeTextValues("householdContext", values.householdContext)
  values.age = typeof values.age === "string" ? values.age.replace(/[^0-9]/g, "") : ""
  values.name = typeof values.name === "string" ? values.name.trim() : ""
  values.riskNotes = typeof values.riskNotes === "string" ? values.riskNotes.trim() : ""
  values.additionalNotes = typeof values.additionalNotes === "string" ? values.additionalNotes.trim() : ""

  for (const review of fieldReviews) {
    if (review.field in careProfileMvpArrayOptions) {
      review.suggestedValues = review.suggestedValues.filter((entry) =>
        careProfileMvpArrayOptions[review.field].includes(entry.value),
      )
    }
  }

  return { values, fieldReviews }
}

function buildEnumArraySchema(options) {
  return {
    type: "array",
    items: options.length > 0 ? { type: "string", enum: options } : { type: "string" },
  }
}

function sanitizeTextValues(field, values) {
  if (!Array.isArray(values)) {
    return []
  }

  const allowedValues = careProfileMvpArrayOptions[field] ?? null

  return values
    .filter(
      (value, index) =>
        typeof value === "string" &&
        value.trim().length > 0 &&
        values.findIndex((entry) => entry === value) === index,
    )
    .map((value) => value.trim())
    .filter((value) => (allowedValues ? allowedValues.includes(value) : true))
}
