import express from "express"
import OpenAI from "openai"

const port = Number(process.env.PORT ?? 8787)
const model = process.env.OPENAI_MODEL ?? "gpt-5.2"
const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.warn("OPENAI_API_KEY is missing. Match reasoning requests will fail until it is set.")
}

const app = express()
const cache = new Map()
const openai = new OpenAI({ apiKey })

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
  } catch (error) {
    console.error("Match reasoning request failed:", error)
    response.status(500).json({ error: "Failed to generate match reasoning." })
  }
})

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
      "You explain a caregiver match for an employer reviewing a senior-care profile.",
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
