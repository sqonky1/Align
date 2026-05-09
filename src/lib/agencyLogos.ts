import harmonyLogo from "../assets/harmony.png"
import nestAidLogo from "../assets/nestaid.png"
import silverCareLogo from "../assets/silvercare.png"

const AGENCY_LOGO_BY_ID: Record<string, string> = {
  "agency-1": silverCareLogo,
  "agency-2": harmonyLogo,
  "agency-3": nestAidLogo,
}

export function getAgencyLogoById(agencyId: string) {
  return AGENCY_LOGO_BY_ID[agencyId] ?? null
}
