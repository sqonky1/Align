import type { CareProfile, Caregiver, SearchCaregiverPill, SearchCaregiverPillTone } from "../types"

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
  const preferredLanguage = profile.preferredLanguage.trim()
  const hasPreferredLanguage =
    preferredLanguage.length > 0 && caregiver.languages.includes(preferredLanguage)

  return {
    key: "language",
    label: "Language",
    score: hasPreferredLanguage ? MATCH_WEIGHTS.language : 0,
    maxScore: preferredLanguage.length > 0 ? MATCH_WEIGHTS.language : 0,
    matchedValues: hasPreferredLanguage ? [preferredLanguage] : [],
    missingValues: hasPreferredLanguage || preferredLanguage.length === 0 ? [] : [preferredLanguage],
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
    strengths.push(`speaks ${language.matchedValues[0]}`)
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

  strengths.push(`${caregiver.yearsOfExperience} years of experience`)

  return strengths.length > 1
    ? `${capitalizeSentence(joinPhrases(strengths.slice(0, 3)))}.`
    : `Offers ${caregiver.yearsOfExperience} years of senior care experience.`
}

function buildMatchAlert(profile: CareProfile, breakdown: MatchDimensionResult[]) {
  const language = breakdown.find((item) => item.key === "language")

  if (language?.missingValues.length) {
    return `Does not cover ${profile.preferredLanguage}, so communication fit is weaker.`
  }

  const largestGap = breakdown
    .filter((item) => item.maxScore > 0 && item.missingValues.length > 0)
    .sort((left, right) => right.maxScore - left.maxScore)[0]

  if (!largestGap) {
    return null
  }

  if (largestGap.key === "conditions") {
    return `Limited coverage for ${formatList(largestGap.missingValues.map(formatDisplayLabel))}.`
  }

  if (largestGap.key === "dailyCareTasks") {
    return `Missing some daily support needs such as ${formatDisplayLabel(largestGap.missingValues[0])}.`
  }

  if (largestGap.key === "mobilitySupport") {
    return `Mobility support gap around ${formatDisplayLabel(largestGap.missingValues[0])}.`
  }

  if (largestGap.key === "medicationSupport") {
    return `Medication support gap around ${formatDisplayLabel(largestGap.missingValues[0])}.`
  }

  if (largestGap.key === "experience") {
    return `Has less experience than the profile complexity would ideally call for.`
  }

  return null
}

function buildMatchTraits(
  profile: CareProfile,
  caregiver: Caregiver,
  breakdown: MatchDimensionResult[],
) {
  const traits: SearchCaregiverPill[] = []
  const language = breakdown.find((item) => item.key === "language")
  const conditions = breakdown.find((item) => item.key === "conditions")
  const dailyCareTasks = breakdown.find((item) => item.key === "dailyCareTasks")
  const mobilitySupport = breakdown.find((item) => item.key === "mobilitySupport")
  const medicationSupport = breakdown.find((item) => item.key === "medicationSupport")
  const experience = breakdown.find((item) => item.key === "experience")

  if (language && profile.preferredLanguage.trim().length > 0) {
    traits.push({
      label: getCaregiverLanguageDisplay(caregiver, profile.preferredLanguage),
      tone: getDimensionTone(language),
    })
  }

  if (conditions && profile.conditions.length > 0) {
    traits.push({
      label: `${conditions.matchedValues.length}/${profile.conditions.length} conditions`,
      tone: getDimensionTone(conditions),
    })
  }

  if (dailyCareTasks && profile.dailyCareTasks.length > 0) {
    traits.push({
      label: `${dailyCareTasks.matchedValues.length}/${profile.dailyCareTasks.length} daily tasks`,
      tone: getDimensionTone(dailyCareTasks),
    })
  }

  if (mobilitySupport && profile.mobilitySupport.length > 0) {
    traits.push({
      label: `${mobilitySupport.matchedValues.length}/${profile.mobilitySupport.length} mobility`,
      tone: getDimensionTone(mobilitySupport),
    })
  }

  if (medicationSupport && profile.medicationSupport.length > 0) {
    traits.push({
      label: `${medicationSupport.matchedValues.length}/${profile.medicationSupport.length} medication`,
      tone: getDimensionTone(medicationSupport),
    })
  }

  if (experience) {
    traits.push({
      label: `${caregiver.yearsOfExperience} years`,
      tone: getDimensionTone(experience),
    })
  }

  return traits.slice(0, 4)
}

function getDimensionTone(item: MatchDimensionResult): SearchCaregiverPillTone {
  if (item.maxScore > 0 && item.score === item.maxScore) {
    return "strong"
  }

  if (item.score === 0) {
    return "gap"
  }

  return "partial"
}

export function getCaregiverLanguageDisplay(
  caregiverOrLanguages: Caregiver | string[],
  preferredLanguage?: string,
) {
  const normalizedPreferredLanguage = preferredLanguage?.trim()
  const languages = Array.isArray(caregiverOrLanguages)
    ? caregiverOrLanguages
    : caregiverOrLanguages.languages

  if (
    normalizedPreferredLanguage &&
    normalizedPreferredLanguage.length > 0 &&
    languages.includes(normalizedPreferredLanguage)
  ) {
    return formatLanguageDisplayLabel(normalizedPreferredLanguage)
  }

  return formatLanguageDisplayLabel(languages[0] ?? "Language not set")
}

function describeCoverage(label: string, matchedCount: number, requestedCount: number) {
  if (matchedCount === requestedCount) {
    return `covers all ${requestedCount} ${pluralize(label, requestedCount)}`
  }

  return `covers ${matchedCount} of ${requestedCount} ${pluralize(label, requestedCount)}`
}

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`
}

function joinPhrases(values: string[]) {
  if (values.length <= 1) {
    return values[0] ?? ""
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`
}

function capitalizeSentence(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatList(values: string[]) {
  return joinPhrases(values)
}

function formatDisplayLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

function formatLanguageDisplayLabel(value: string) {
  if (value === "Malay") {
    return "Bahasa Melayu"
  }

  return value
}
