# Align

Align is an MVP for senior-care matching in an FDW support workflow. Employers create structured care profiles, run ranked caregiver matching, review fit details, shortlist candidates, and hand off to agencies for placement.

## What Is Implemented

- Employer workspace at `/` with care profile list and saved caregivers
- Care profile create/edit flow at `/profiles/new` and `/profiles/:profileId/edit`
- Care profile detail page at `/profiles/:profileId`
- Search page at `/search` with:
- Browse mode (no profile context)
- Matched mode (`?profile=<id>`) with ranked results and loading state
- Caregiver detail page at `/caregivers/:caregiverId` with:
- Match breakdown against active profile
- Shortlist toggle per profile
- Agency handoff simulation UI
- AI-generated practical match reasoning (via backend API)

## Matching Model

Matching is weighted, rule-based, and explainable (0-100).

Weights in [src/lib/matching.ts](/Users/lawrence/Documents/Align/src/lib/matching.ts):

- Language: `32`
- Conditions: `22`
- Daily care tasks: `18`
- Mobility support: `12`
- Medication support: `10`
- Experience: `6`

Notes:

- Only structured fields contribute to score
- Free-text notes (`riskNotes`, `additionalNotes`) are context only
- Tie-breakers: match percent, raw score, years of experience, then name

## Tech Stack

- Frontend: Vite + React + TypeScript + React Router
- Backend: Express (`server/index.js`)
- AI SDK: OpenAI Node SDK
- Data: mock source files + `localStorage` persistence for profile/saved state

## Local Development

1. Install deps:

```bash
npm install
```

2. Add env vars in `.env`:

```bash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.2
PORT=8787
```

3. Run client + server:

```bash
npm run dev
```

4. Build:

```bash
npm run build
```

## API (Current)

- `GET /api/health` health check
- `POST /api/match-reasoning` returns 2-3 sentence practical reasoning for a profile-caregiver match

If `OPENAI_API_KEY` is missing, match-reasoning requests fail by design.

## Documentation

- Developer documentation: this `README.md`
- Product usage guide: [UserGuide.md](/Users/lawrence/Documents/Align/UserGuide.md)

## Medical Document Processing (Next Implementation)

Next, we will add medical document processing to prefill a care profile from uploaded notes/reports while keeping human review in the loop.

Planned extraction targets (mapped to existing care profile shape in [src/types/index.ts](/Users/lawrence/Documents/Align/src/types/index.ts)):

- Recipient identity/details:
- `name`, `age`, `gender`, `preferredLanguage` (when explicitly stated)
- Care needs:
- `conditions`
- `dailyCareTasks`
- `mobilitySupport`
- `medicationSupport`
- Home context:
- `householdContext`
- Writing details / context:
- `riskNotes`
- `additionalNotes`

Implementation approach:

- Add upload + parse endpoint (new API route)
- Use structured LLM extraction into a strict schema
- Normalize extracted values to option sets in [src/lib/careProfiles.ts](/Users/lawrence/Documents/Align/src/lib/careProfiles.ts)
- Return field-level confidence + source snippets for review
- Let user accept/edit before saving profile

Guardrails:

- Do not invent missing facts
- Keep uncertain content in notes, not structured fields
- Keep extraction auditable with source-to-field traceability

## Key Files

- [src/app/routes.tsx](/Users/lawrence/Documents/Align/src/app/routes.tsx)
- [src/pages/SearchPage.tsx](/Users/lawrence/Documents/Align/src/pages/SearchPage.tsx)
- [src/pages/CaregiverDetailPage.tsx](/Users/lawrence/Documents/Align/src/pages/CaregiverDetailPage.tsx)
- [src/pages/NewCareProfilePage.tsx](/Users/lawrence/Documents/Align/src/pages/NewCareProfilePage.tsx)
- [src/lib/matching.ts](/Users/lawrence/Documents/Align/src/lib/matching.ts)
- [src/lib/careProfiles.ts](/Users/lawrence/Documents/Align/src/lib/careProfiles.ts)
- [src/types/index.ts](/Users/lawrence/Documents/Align/src/types/index.ts)
- [server/index.js](/Users/lawrence/Documents/Align/server/index.js)
