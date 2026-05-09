import type { CareProfile, Caregiver, SearchCaregiverPill } from "../types"

const MATCH_WEIGHTS = {
  language: 32,
  conditions: 22,
  dailyCareTasks: 18,
  mobilitySupport: 12,
  medicationSupport: 10,
  experience: 6,
} as const

const COMPLEX_MOBILITY_SKILLS = new Set([
  "transfer_support",
  "wheelchair_support",
  "bedbound_support",
])

type MatchDimensionKey = keyof typeof MATCH_WEIGHTS

export type MatchDimensionResult = {
  key: MatchDimensionKey
  label: string
  score: number
  maxScore: number
  matchedValues: string[]
  missingValues: string[]
}

export type CaregiverMatchResult = {
  caregiver: Caregiver
  score: number
  possibleScore: number
  matchPercent: number
  breakdown: MatchDimensionResult[]
  summary: string
  alert: string | null
  traits: SearchCaregiverPill[]
}

export function getRankedCaregiverMatches(
  profile: CareProfile,
  caregivers: Caregiver[],
): CaregiverMatchResult[] {
  return caregivers
    .map((caregiver) => scoreCaregiverMatch(profile, caregiver))
    .sort((left, right) => {
      if (right.matchPercent !== left.matchPercent) {
        return right.matchPercent - left.matchPercent
      }

      if (right.score !== left.score) {
        return right.score - left.score
      }

      if (right.caregiver.yearsOfExperience !== left.caregiver.yearsOfExperience) {
        return right.caregiver.yearsOfExperience - left.caregiver.yearsOfExperience
      }

      return left.caregiver.name.localeCompare(right.caregiver.name)
    })
}

export function scoreCaregiverMatch(
  profile: CareProfile,
  caregiver: Caregiver,
): CaregiverMatchResult {
  const language = scoreLanguage(profile, caregiver)
  const conditions = scoreOverlapDimension({
    key: "conditions",
    label: "Conditions",
    requestedValues: profile.conditions,
    caregiverValues: caregiver.careConditions,
  })
  const dailyCareTasks = scoreOverlapDimension({
    key: "dailyCareTasks",
    label: "Daily care tasks",
    requestedValues: profile.dailyCareTasks,
    caregiverValues: caregiver.careTasks,
  })
  const mobilitySupport = scoreOverlapDimension({
    key: "mobilitySupport",
    label: "Mobility support",
    requestedValues: profile.mobilitySupport,
    caregiverValues: caregiver.mobilitySkills,
  })
  const medicationSupport = scoreOverlapDimension({
    key: "medicationSupport",
    label: "Medication support",
    requestedValues: profile.medicationSupport,
    caregiverValues: caregiver.medicationSkills,
  })
  const experience = scoreExperience(profile, caregiver)

  const breakdown = [
    language,
    conditions,
    dailyCareTasks,
    mobilitySupport,
    medicationSupport,
    experience,
  ]
  const score = breakdown.reduce((total, item) => total + item.score, 0)
  const possibleScore = breakdown.reduce((total, item) => total + item.maxScore, 0)
  const matchPercent = possibleScore > 0 ? Math.round((score / possibleScore) * 100) : 0

  return {
    caregiver,
    score,
    possibleScore,
    matchPercent,
    breakdown,
    summary: buildMatchSummary(profile, caregiver, breakdown),
    alert: buildMatchAlert(profile, breakdown),
    traits: buildMatchTraits(profile, caregiver, breakdown),
  }
}

function scoreLanguage(profile: CareProfile, caregiver: Caregiver): MatchDimensionResult {
  const preferredLanguages = getPreferredLanguages(profile)

  if (preferredLanguages.length === 0) {
    return {
      key: "language",
      label: "Language",
      score: 0,
      maxScore: 0,
      matchedValues: [],
      missingValues: [],
    }
  }

  const matchedValues = preferredLanguages.filter((language) => caregiver.languages.includes(language))
  const missingValues = preferredLanguages.filter((language) => !caregiver.languages.includes(language))

  return {
    key: "language",
    label: "Language",
    score: (matchedValues.length / preferredLanguages.length) * MATCH_WEIGHTS.language,
    maxScore: MATCH_WEIGHTS.language,
    matchedValues,
    missingValues,
  }
}

function scoreOverlapDimension({
  key,
  label,
  requestedValues,
  caregiverValues,
}: {
  key: Exclude<MatchDimensionKey, "language" | "experience">
  label: string
  requestedValues: string[]
  caregiverValues: string[]
}): MatchDimensionResult {
  if (requestedValues.length === 0) {
    return {
      key,
      label,
      score: 0,
      maxScore: 0,
      matchedValues: [],
      missingValues: [],
    }
  }

  const matchedValues = requestedValues.filter((value) => caregiverValues.includes(value))
  const missingValues = requestedValues.filter((value) => !caregiverValues.includes(value))

  return {
    key,
    label,
    score: (matchedValues.length / requestedValues.length) * MATCH_WEIGHTS[key],
    maxScore: MATCH_WEIGHTS[key],
    matchedValues,
    missingValues,
  }
}

function scoreExperience(profile: CareProfile, caregiver: Caregiver): MatchDimensionResult {
  const targetYears = getTargetExperienceYears(profile)
  const experienceRatio = Math.min(caregiver.yearsOfExperience / targetYears, 1)

  return {
    key: "experience",
    label: "Experience",
    score: experienceRatio * MATCH_WEIGHTS.experience,
    maxScore: MATCH_WEIGHTS.experience,
    matchedValues: [`${caregiver.yearsOfExperience} years`],
    missingValues: caregiver.yearsOfExperience >= targetYears ? [] : [`Target ${targetYears} years`],
  }
}

function getTargetExperienceYears(profile: CareProfile) {
  const needsCount =
    profile.conditions.length +
    profile.dailyCareTasks.length +
    profile.mobilitySupport.length +
    profile.medicationSupport.length
  const hasComplexMobilityNeed = profile.mobilitySupport.some((value) =>
    COMPLEX_MOBILITY_SKILLS.has(value),
  )

  let targetYears = 2

  if (needsCount >= 4) {
    targetYears += 1
  }

  if (needsCount >= 7) {
    targetYears += 1
  }

  if (profile.conditions.length >= 2) {
    targetYears += 1
  }

  if (hasComplexMobilityNeed || profile.medicationSupport.length >= 2) {
    targetYears += 1
  }

  return Math.min(targetYears, 6)
}

function buildMatchSummary(
  profile: CareProfile,
  caregiver: Caregiver,
  breakdown: MatchDimensionResult[],
) {
  const language = breakdown.find((item) => item.key === "language")
  const conditions = breakdown.find((item) => item.key === "conditions")
  const dailyCareTasks = breakdown.find((item) => item.key === "dailyCareTasks")
  const mobilitySupport = breakdown.find((item) => item.key === "mobilitySupport")
  const medicationSupport = breakdown.find((item) => item.key === "medicationSupport")

  const strengths: string[] = []

  if (language?.matchedValues.length) {
    strengths.push(
      language.matchedValues.length === 1
        ? `speaks ${language.matchedValues[0]}`
        : `covers ${language.matchedValues.length} preferred languages`,
    )
  }

  if (conditions && conditions.matchedValues.length > 0) {
    strengths.push(
      describeCoverage("condition", conditions.matchedValues.length, profile.conditions.length),
    )
  }

  if (dailyCareTasks && dailyCareTasks.matchedValues.length > 0) {
    strengths.push(
      describeCoverage(
        "daily care need",
        dailyCareTasks.matchedValues.length,
        profile.dailyCareTasks.length,
      ),
    )
  }

  if (mobilitySupport && mobilitySupport.matchedValues.length > 0) {
    strengths.push(
      describeCoverage(
        "mobility need",
        mobilitySupport.matchedValues.length,
        profile.mobilitySupport.length,
      ),
    )
  }

  if (medicationSupport && medicationSupport.matchedValues.length > 0) {
    strengths.push(
      describeCoverage(
        "medication need",
        medicationSupport.matchedValues.length,
        profile.medicationSupport.length,
      ),
    )
  }

  if (strengths.length === 0) {
    return `${caregiver.name} brings ${caregiver.yearsOfExperience} years of experience, but this profile still needs closer manual review for practical fit.`
  }

  const lead = strengths.slice(0, 2).join(" and ")
  return `${caregiver.name} stands out because the helper ${lead}. They bring ${caregiver.yearsOfExperience} years of experience for this care setup.`
}

function buildMatchAlert(profile: CareProfile, breakdown: MatchDimensionResult[]) {
  const language = breakdown.find((item) => item.key === "language")
  const mobilitySupport = breakdown.find((item) => item.key === "mobilitySupport")
  const medicationSupport = breakdown.find((item) => item.key === "medicationSupport")

  if (language && language.maxScore > 0 && language.matchedValues.length === 0) {
    return `Does not cover ${getPreferredLanguages(profile).join(", ")}, so communication fit is weaker.`
  }

  if (mobilitySupport && mobilitySupport.missingValues.length > 0) {
    return `Missing ${formatList(mobilitySupport.missingValues.map(formatTraitLabel))} support.`
  }

  if (medicationSupport && medicationSupport.missingValues.length > 0) {
    return `Medication support gap: ${formatList(medicationSupport.missingValues.map(formatTraitLabel))}.`
  }

  return null
}

function buildMatchTraits(
  profile: CareProfile,
  caregiver: Caregiver,
  breakdown: MatchDimensionResult[],
): SearchCaregiverPill[] {
  const language = breakdown.find((item) => item.key === "language")
  const conditions = breakdown.find((item) => item.key === "conditions")
  const dailyCareTasks = breakdown.find((item) => item.key === "dailyCareTasks")
  const mobilitySupport = breakdown.find((item) => item.key === "mobilitySupport")
  const medicationSupport = breakdown.find((item) => item.key === "medicationSupport")

  const pills: SearchCaregiverPill[] = []

  if (language && getPreferredLanguages(profile).length > 0) {
    pills.push({
      label: getCaregiverLanguageDisplay(caregiver, getPreferredLanguages(profile)),
      tone: language.matchedValues.length > 0 ? "strong" : "gap",
    })
  }

  addCoveragePills(pills, conditions)
  addCoveragePills(pills, dailyCareTasks)
  addCoveragePills(pills, mobilitySupport)
  addCoveragePills(pills, medicationSupport)

  if (pills.length === 0) {
    pills.push({
      label: `${caregiver.yearsOfExperience} years experience`,
      tone: "partial",
    })
  }

  return pills.slice(0, 4)
}

function addCoveragePills(
  pills: SearchCaregiverPill[],
  dimension: MatchDimensionResult | undefined,
) {
  if (!dimension || dimension.maxScore === 0) {
    return
  }

  if (dimension.matchedValues.length > 0) {
    pills.push({
      label:
        dimension.matchedValues.length === dimension.missingValues.length + dimension.matchedValues.length
          ? `${dimension.label} covered`
          : `${dimension.matchedValues.length}/${dimension.matchedValues.length + dimension.missingValues.length} ${dimension.label.toLowerCase()} covered`,
      tone: dimension.missingValues.length === 0 ? "strong" : "partial",
    })
    return
  }

  pills.push({
    label: `${dimension.label} gap`,
    tone: "gap",
  })
}

function describeCoverage(label: string, covered: number, total: number) {
  if (covered >= total) {
    return `covers all requested ${label}${total > 1 ? "s" : ""}`
  }

  return `covers ${covered} of ${total} requested ${label}${total > 1 ? "s" : ""}`
}

function formatTraitLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

function formatList(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? ""
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`
}

export function getCaregiverLanguageDisplay(
  caregiver: Caregiver,
  preferredLanguage?: string | string[],
) {
  const preferredLanguages = Array.isArray(preferredLanguage)
    ? preferredLanguage.map((value) => value.trim()).filter(Boolean)
    : preferredLanguage
      ? [preferredLanguage.trim()].filter(Boolean)
      : []

  if (preferredLanguages.length > 0) {
    const matches = preferredLanguages.filter((language) => caregiver.languages.includes(language))

    if (matches.length > 0) {
      return matches.length === 1
        ? `Speaks ${matches[0]}`
        : `Speaks ${matches.join(", ")}`
    }

    return `Missing ${preferredLanguages.join(", ")}`
  }

  if (caregiver.languages.length === 0) {
    return "Languages not listed"
  }

  return `Speaks ${caregiver.languages.join(", ")}`
}

function getPreferredLanguages(profile: CareProfile) {
  const preferredLanguages = Array.isArray(profile.preferredLanguages)
    ? profile.preferredLanguages.map((value) => value.trim()).filter(Boolean)
    : []

  if (preferredLanguages.length > 0) {
    return preferredLanguages
  }

  const fallbackPreferredLanguage = typeof profile.preferredLanguage === "string"
    ? profile.preferredLanguage.trim()
    : ""

  return fallbackPreferredLanguage.length > 0 ? [fallbackPreferredLanguage] : []
}
