export function getRankAccentClass(index: number) {
  if (index === 0) {
    return "caregiver-card-rank-gold"
  }

  if (index === 1) {
    return "caregiver-card-rank-silver"
  }

  return "caregiver-card-rank-bronze"
}
