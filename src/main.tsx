import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./app/App"
import { initializeCaregiverOnboardingStorage } from "./features/caregiverOnboarding/storage"
import "./index.css"
import { initializeWorkspaceData } from "./lib/data"
import { initializeMatchReasoningCache } from "./lib/matchReasoning"

async function bootstrap() {
  await Promise.all([
    initializeWorkspaceData(),
    initializeCaregiverOnboardingStorage(),
    initializeMatchReasoningCache(),
  ])

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
